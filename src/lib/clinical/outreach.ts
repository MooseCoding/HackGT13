import type { PatientSnapshot } from "@/lib/types";

/** Prefill for clinician-to-patient outreach - never routes through the family circle. */
export function directOutreachDraft(
  patientFirstName: string,
  riskLevel: PatientSnapshot["riskLevel"],
) {
  const name = patientFirstName.trim() || "there";
  if (riskLevel === "priority") {
    return `Hi ${name}, this is your care team. We've noticed a shift in how you've been communicating over the last couple weeks and would like a short call. Do you have 15 minutes this week?`;
  }
  if (riskLevel === "monitor") {
    return `Hi ${name}, this is your care team. Wanted to check in directly about how you've been lately. Would a short call this week work?`;
  }
  return "";
}
