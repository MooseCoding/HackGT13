import { assignPatientToClinician, listPatientAssignments } from "./assignments";
import { isPatientInClinicianNetwork } from "./insurance";
import { allMembers, optedInPatients } from "@/lib/data";

const g = globalThis as typeof globalThis & {
  __hearthAutoAccept?: Record<string, boolean>;
};

export function getAutoAcceptPatients(clinicianId: string) {
  return Boolean(g.__hearthAutoAccept?.[clinicianId]);
}

export function setAutoAcceptPatients(clinicianId: string, enabled: boolean) {
  if (!g.__hearthAutoAccept) g.__hearthAutoAccept = {};
  g.__hearthAutoAccept[clinicianId] = enabled;
}

export async function autoAssignInNetworkPatients(clinicianId: string) {
  const [patients, members, assignments] = await Promise.all([
    optedInPatients(),
    allMembers(),
    listPatientAssignments(),
  ]);
  const assignedIds = new Set(assignments.map((assignment) => assignment.memberId));
  const memberById = new Map(members.map((member) => [member.id, member]));

  for (const patient of patients) {
    if (assignedIds.has(patient.memberId)) continue;
    const member = memberById.get(patient.memberId);
    if (!member || !isPatientInClinicianNetwork(clinicianId, member)) continue;
    try {
      await assignPatientToClinician(patient.memberId, clinicianId);
      assignedIds.add(patient.memberId);
    } catch {
      // Another clinician may have picked them up first.
    }
  }
}
