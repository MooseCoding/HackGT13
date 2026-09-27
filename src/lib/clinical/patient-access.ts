import { isClinicianUser } from "@/lib/auth";
import { seedDemoPatientAssignments } from "@/lib/clinical/assignments";
import { canClinicianAccessPatient, clinicalPatientById } from "@/lib/clinical/operations";
import { isDemoMode } from "@/lib/mode-server";

/** Loads a patient only for the clinician who has them on their roster. */
export async function authorizedClinicalPatient(memberId: string) {
  if (!(await isClinicianUser())) throw new Error("Clinician access required.");
  if (await isDemoMode()) seedDemoPatientAssignments();
  const access = await canClinicianAccessPatient(memberId);
  if (!access.allowed) throw new Error("This patient is assigned to another clinician.");
  if (!access.assigned) throw new Error("Add this patient to your roster before using clinician tools.");
  const patient = await clinicalPatientById(memberId);
  if (!patient) throw new Error("Patient snapshot not found.");
  return patient;
}
