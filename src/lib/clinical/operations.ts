import { analyzeMember } from "@/lib/analysis";
import { isClinicianUser } from "@/lib/auth";
import { DEMO_NOW } from "@/lib/clock";
import { allMembers, optedInPatients } from "@/lib/data";
import { isDemoMode } from "@/lib/mode-server";
import { patientById as demoPatientById } from "@/lib/store";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import type { AudioMetrics, CalendarEvent, Family, Member, PatientSnapshot, Post } from "@/lib/types";

export type ClinicalAlertStatus = "new" | "reviewing" | "contacted" | "dismissed";

export type ClinicalAlert = {
  id: string;
  memberId: string;
  familyId: string;
  riskLevel: "monitor" | "priority";
  status: ClinicalAlertStatus;
  title: string;
  summary: string;
  suggestedAction: string;
  createdAt: string;
  updatedAt: string;
};

export type ClinicalDashboardData = {
  patients: PatientSnapshot[];
  members: Member[];
  alerts: ClinicalAlert[];
  lastRunAt: string | null;
};

function mapMember(row: Record<string, unknown>): Member {
  return {
    id: String(row.id),
    familyId: String(row.family_id),
    name: String(row.name),
    role: String(row.role),
    age: Number(row.age),
    initials: String(row.initials),
    color: String(row.color),
    location: String(row.location),
    street: String(row.street ?? ""),
    apt: String(row.apt ?? ""),
    city: String(row.city ?? ""),
    state: String(row.state ?? ""),
    postalCode: String(row.postal_code ?? ""),
    country: String(row.country ?? "US"),
    clinicalOptIn: Boolean(row.clinical_opt_in),
    easyModeDefault: Boolean(row.easy_mode_default),
  };
}

function mapPost(row: Record<string, unknown>): Post {
  return {
    id: String(row.id),
    familyId: String(row.family_id),
    authorId: String(row.author_id),
    kind: row.kind as Post["kind"],
    body: String(row.body ?? ""),
    createdAt: String(row.created_at),
    threadId: row.thread_id ? String(row.thread_id) : undefined,
    photoUrl: row.photo_url ? String(row.photo_url) : undefined,
    photoAlt: row.photo_alt ? String(row.photo_alt) : undefined,
    voiceSeconds: row.voice_seconds == null ? undefined : Number(row.voice_seconds),
    transcript: row.transcript ? String(row.transcript) : undefined,
    channel: (row.source_channel as Post["channel"]) ?? "hearth",
    externalMessageId: row.external_message_id ? String(row.external_message_id) : undefined,
    audioMetrics: (row.audio_metrics as AudioMetrics | null) ?? undefined,
    rawRetained: row.raw_retained == null ? true : Boolean(row.raw_retained),
  };
}

function mapEvent(row: Record<string, unknown>): CalendarEvent {
  return {
    id: String(row.id),
    familyId: String(row.family_id),
    title: String(row.title),
    startsAt: String(row.starts_at),
    endsAt: row.ends_at ? String(row.ends_at) : undefined,
    location: row.location ? String(row.location) : undefined,
    attendees: Array.isArray(row.attendees) ? row.attendees.map(String) : [],
    sourceText: String(row.source_text ?? ""),
    createdBy: String(row.created_by),
  };
}

function mapAlert(row: Record<string, unknown>): ClinicalAlert {
  return {
    id: String(row.id),
    memberId: String(row.member_id),
    familyId: String(row.family_id),
    riskLevel: row.risk_level as ClinicalAlert["riskLevel"],
    status: row.status as ClinicalAlertStatus,
    title: String(row.title),
    summary: String(row.summary),
    suggestedAction: String(row.suggested_action),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function alertFingerprint(snapshot: PatientSnapshot) {
  return [snapshot.riskLevel, ...snapshot.flags.map((flag) => flag.code).sort()].join(":");
}

export async function runPersistedClinicalAnalysis() {
  const admin = createSupabaseAdmin();
  const started = await admin.from("clinical_analysis_runs").insert({ status: "running" }).select("*").single();
  if (started.error || !started.data) throw new Error(started.error?.message || "Could not start clinical analysis.");
  const runId = started.data.id;

  try {
    const memberResult = await admin.from("members").select("*").eq("clinical_opt_in", true);
    if (memberResult.error) throw new Error(memberResult.error.message);
    const members = (memberResult.data ?? []).map((row) => mapMember(row));
    const familyIds = [...new Set(members.map((member) => member.familyId))];
    const postResult = familyIds.length
      ? await admin.from("posts").select("*").in("family_id", familyIds)
      : { data: [], error: null };
    if (postResult.error) throw new Error(postResult.error.message);
    const posts = (postResult.data ?? []).map((row) => mapPost(row));
    const referenceDate = new Date();
    const snapshots = members.map((member) =>
      analyzeMember(member.id, posts.filter((post) => post.familyId === member.familyId), referenceDate),
    );

    let queuedCount = 0;
    for (const snapshot of snapshots) {
      const inserted = await admin
        .from("clinical_snapshots")
        .insert({
          run_id: runId,
          member_id: snapshot.memberId,
          family_id: snapshot.familyId,
          risk_level: snapshot.riskLevel,
          confidence: snapshot.confidence,
          assessed_at: snapshot.assessedAt,
          snapshot: snapshot as unknown as Json,
        })
        .select("id")
        .single();
      if (inserted.error || !inserted.data) throw new Error(inserted.error?.message || "Could not save clinical snapshot.");
      if (snapshot.riskLevel === "stable") continue;

      queuedCount += 1;
      const fingerprint = alertFingerprint(snapshot);
      const existing = await admin
        .from("clinical_alerts")
        .select("id")
        .eq("member_id", snapshot.memberId)
        .eq("fingerprint", fingerprint)
        .in("status", ["new", "reviewing"])
        .maybeSingle();
      if (existing.error) throw new Error(existing.error.message);
      const leadingTitle = snapshot.flags[0]?.title ?? "Personal baseline shift detected";
      const values = {
        snapshot_id: inserted.data.id,
        risk_level: snapshot.riskLevel,
        title: leadingTitle,
        summary: snapshot.note,
        suggested_action: snapshot.nextStep,
        updated_at: new Date().toISOString(),
      };
      const alertResult = existing.data
        ? await admin.from("clinical_alerts").update(values).eq("id", existing.data.id)
        : await admin.from("clinical_alerts").insert({
            ...values,
            member_id: snapshot.memberId,
            family_id: snapshot.familyId,
            fingerprint,
          });
      if (alertResult.error) throw new Error(alertResult.error.message);
    }

    const completedAt = new Date().toISOString();
    const completed = await admin
      .from("clinical_analysis_runs")
      .update({ status: "completed", completed_at: completedAt, patient_count: snapshots.length, queued_count: queuedCount })
      .eq("id", runId);
    if (completed.error) throw new Error(completed.error.message);
    return { runId, analyzedAt: completedAt, patients: snapshots, queuedCount };
  } catch (error) {
    await admin
      .from("clinical_analysis_runs")
      .update({ status: "failed", completed_at: new Date().toISOString(), error: error instanceof Error ? error.message : "Unknown error" })
      .eq("id", runId);
    throw error;
  }
}

export async function clinicalDashboardData(): Promise<ClinicalDashboardData> {
  if (await isDemoMode()) {
    const [patients, members] = await Promise.all([optedInPatients(), allMembers()]);
    const alerts = patients
      .filter((patient) => patient.riskLevel !== "stable")
      .map((patient) => ({
        id: `demo-${patient.memberId}`,
        memberId: patient.memberId,
        familyId: patient.familyId,
        riskLevel: patient.riskLevel as "monitor" | "priority",
        status: "new" as const,
        title: patient.flags[0]?.title ?? "Personal baseline shift detected",
        summary: patient.note,
        suggestedAction: patient.nextStep,
        createdAt: DEMO_NOW.toISOString(),
        updatedAt: DEMO_NOW.toISOString(),
      }));
    return { patients, members, alerts, lastRunAt: DEMO_NOW.toISOString() };
  }

  if (!(await isClinicianUser())) throw new Error("Clinician access required.");

  const admin = createSupabaseAdmin();
  const [snapshotResult, memberResult, alertResult, runResult] = await Promise.all([
    admin.from("clinical_snapshots").select("*").order("assessed_at", { ascending: false }),
    admin.from("members").select("*").eq("clinical_opt_in", true),
    admin.from("clinical_alerts").select("*").order("updated_at", { ascending: false }),
    admin.from("clinical_analysis_runs").select("*").eq("status", "completed").order("completed_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  for (const error of [snapshotResult.error, memberResult.error, alertResult.error, runResult.error]) {
    if (error) throw new Error(error.message);
  }
  const seen = new Set<string>();
  const patients = (snapshotResult.data ?? []).flatMap((row) => {
    if (seen.has(row.member_id)) return [];
    seen.add(row.member_id);
    return [row.snapshot as unknown as PatientSnapshot];
  });
  return {
    patients,
    members: (memberResult.data ?? []).map((row) => mapMember(row)),
    alerts: (alertResult.data ?? []).map((row) => mapAlert(row)),
    lastRunAt: runResult.data?.completed_at ?? null,
  };
}

export async function clinicalPatientById(id: string) {
  if (await isDemoMode()) return demoPatientById(id);
  if (!(await isClinicianUser())) throw new Error("Clinician access required.");
  const admin = createSupabaseAdmin();
  const snapshotResult = await admin
    .from("clinical_snapshots")
    .select("*")
    .eq("member_id", id)
    .order("assessed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (snapshotResult.error) throw new Error(snapshotResult.error.message);
  if (!snapshotResult.data) return null;
  const [memberResult, familyResult, postResult, eventResult] = await Promise.all([
    admin.from("members").select("*").eq("id", id).maybeSingle(),
    admin.from("families").select("*").eq("id", snapshotResult.data.family_id).maybeSingle(),
    admin.from("posts").select("*").eq("author_id", id).order("created_at", { ascending: false }),
    admin.from("calendar_events").select("*").eq("family_id", snapshotResult.data.family_id).order("starts_at"),
  ]);
  for (const error of [memberResult.error, familyResult.error, postResult.error, eventResult.error]) {
    if (error) throw new Error(error.message);
  }
  if (!memberResult.data || !familyResult.data) return null;
  const family: Family = {
    id: familyResult.data.id,
    name: familyResult.data.name,
    tagline: familyResult.data.tagline,
    inviteCode: familyResult.data.join_code,
  };
  return {
    member: mapMember(memberResult.data),
    family,
    snapshot: snapshotResult.data.snapshot as unknown as PatientSnapshot,
    posts: (postResult.data ?? []).map((row) => mapPost(row)),
    events: (eventResult.data ?? []).map((row) => mapEvent(row)),
  };
}
