import { getAuthUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/mode-server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";

export const DEMO_CLINICIAN_ID = "demo-pcp";

export type PatientAssignment = {
  memberId: string;
  clinicianId: string;
  assignedAt: string;
};

type AssignmentStore = {
  assignments: PatientAssignment[];
};

const g = globalThis as typeof globalThis & {
  __hearthAssignments?: AssignmentStore;
  __hearthAssignmentsMemoryFallback?: boolean;
};

function demoStore(): AssignmentStore {
  if (!g.__hearthAssignments) {
    g.__hearthAssignments = { assignments: [] };
  }
  return g.__hearthAssignments;
}

function isMissingAssignmentsTable(error: { message?: string; code?: string } | null | undefined) {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "PGRST205" ||
    message.includes("schema cache") ||
    message.includes("clinical_patient_assignments")
  );
}

function assignmentsUseMemory() {
  return Boolean(g.__hearthAssignmentsMemoryFallback);
}

async function assignmentsPreferMemory(error?: { message?: string; code?: string } | null) {
  if (await isDemoMode()) return true;
  if (assignmentsUseMemory()) return true;
  if (isMissingAssignmentsTable(error)) {
    g.__hearthAssignmentsMemoryFallback = true;
    console.warn(
      "clinical_patient_assignments is unavailable; using in-memory roster until the migration is applied.",
    );
    return true;
  }
  return false;
}

export async function currentClinicianId() {
  if (await isDemoMode()) return DEMO_CLINICIAN_ID;
  const user = await getAuthUser();
  return user?.id ?? null;
}

export async function listPatientAssignments(): Promise<PatientAssignment[]> {
  if (await assignmentsPreferMemory()) return [...demoStore().assignments];

  const admin = createSupabaseAdmin();
  const result = await admin.from("clinical_patient_assignments").select("*").order("assigned_at", { ascending: false });
  if (await assignmentsPreferMemory(result.error)) return [...demoStore().assignments];
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []).map((row) => ({
    memberId: row.member_id,
    clinicianId: row.clinician_id,
    assignedAt: row.assigned_at,
  }));
}

export async function assignmentForMember(memberId: string): Promise<PatientAssignment | null> {
  const all = await listPatientAssignments();
  return all.find((assignment) => assignment.memberId === memberId) ?? null;
}

export async function assignPatientToClinician(memberId: string, clinicianId: string) {
  if (await isDemoMode()) {
    const member = (await import("@/lib/store")).db().members.find((row) => row.id === memberId);
    if (!member?.clinicalOptIn) throw new Error("This patient has not enabled clinician sharing.");
  } else {
    const admin = createSupabaseAdmin();
    const memberResult = await admin
      .from("members")
      .select("clinical_opt_in")
      .eq("id", memberId)
      .maybeSingle();
    if (memberResult.error) throw new Error(memberResult.error.message);
    if (!memberResult.data?.clinical_opt_in) {
      throw new Error("This patient has not enabled clinician sharing.");
    }
  }

  const existing = await assignmentForMember(memberId);
  if (existing) {
    if (existing.clinicianId === clinicianId) return existing;
    throw new Error("This patient is already assigned to another clinician.");
  }

  const assignedAt = new Date().toISOString();
  const assignment = { memberId, clinicianId, assignedAt };
  if (await assignmentsPreferMemory()) {
    demoStore().assignments.push(assignment);
    return assignment;
  }

  const supabase = await createSupabaseServer();
  const result = await supabase
    .from("clinical_patient_assignments")
    .insert({ member_id: memberId, clinician_id: clinicianId, assigned_at: assignedAt })
    .select("*")
    .single();
  if (await assignmentsPreferMemory(result.error)) {
    demoStore().assignments.push(assignment);
    return assignment;
  }
  if (result.error) throw new Error(result.error.message);
  return {
    memberId: result.data.member_id,
    clinicianId: result.data.clinician_id,
    assignedAt: result.data.assigned_at,
  };
}

export async function releasePatientAssignment(memberId: string, clinicianId: string) {
  const existing = await assignmentForMember(memberId);
  if (!existing) return false;
  if (existing.clinicianId !== clinicianId) {
    throw new Error("Only the assigned clinician can release this patient.");
  }

  if (await assignmentsPreferMemory()) {
    demoStore().assignments = demoStore().assignments.filter((assignment) => assignment.memberId !== memberId);
    return true;
  }

  const supabase = await createSupabaseServer();
  const result = await supabase
    .from("clinical_patient_assignments")
    .delete()
    .eq("member_id", memberId)
    .eq("clinician_id", clinicianId);
  if (await assignmentsPreferMemory(result.error)) {
    demoStore().assignments = demoStore().assignments.filter((assignment) => assignment.memberId !== memberId);
    return true;
  }
  if (result.error) throw new Error(result.error.message);
  return true;
}

export function seedDemoPatientAssignments() {
  const store = demoStore();
  if (store.assignments.length) return;
  store.assignments.push({
    memberId: "elena",
    clinicianId: DEMO_CLINICIAN_ID,
    assignedAt: new Date().toISOString(),
  });
}
