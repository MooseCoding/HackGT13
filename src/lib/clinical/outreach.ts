import type { PatientSnapshot } from "@/lib/types";

/** Prefill for clinician-to-patient outreach — never routes through the family circle. */
export function directOutreachDraft(
  patientFirstName: string,
  riskLevel: PatientSnapshot["riskLevel"],
) {
  const name = patientFirstName.trim() || "there";
  if (riskLevel === "priority") {
    return `Hi ${name}, this is your care team reaching out directly. We've noticed a shift in your communication patterns over the past two weeks and would like to schedule a brief call with you. Do you have 15 minutes this week for a check-in?`;
  }
  if (riskLevel === "monitor") {
    return `Hi ${name}, this is your care team checking in. We wanted to connect with you directly about how you've been doing lately. Would a short call sometime this week work for you?`;
  }
  return "";
}
