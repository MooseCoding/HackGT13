export const FAMILY_CALL_FREQUENCIES = ["weekly", "biweekly", "monthly", "none"] as const;
export type FamilyCallFrequency = (typeof FAMILY_CALL_FREQUENCIES)[number];

export const DEFAULT_FAMILY_CALL_FREQUENCY: FamilyCallFrequency = "weekly";

export const FAMILY_CALL_FREQUENCY_OPTIONS: { value: FamilyCallFrequency; label: string; hint: string }[] = [
  { value: "weekly", label: "Weekly", hint: "One call each week" },
  { value: "biweekly", label: "Every two weeks", hint: "One call every other week" },
  { value: "monthly", label: "Monthly", hint: "One call each month" },
  { value: "none", label: "Don't schedule", hint: "No automatic call suggestions" },
];

export function parseFamilyCallFrequency(raw: unknown): FamilyCallFrequency {
  if (typeof raw === "string" && (FAMILY_CALL_FREQUENCIES as readonly string[]).includes(raw)) {
    return raw as FamilyCallFrequency;
  }
  return DEFAULT_FAMILY_CALL_FREQUENCY;
}

export function familyCallFrequencyLabel(frequency: FamilyCallFrequency) {
  return FAMILY_CALL_FREQUENCY_OPTIONS.find((o) => o.value === frequency)?.label ?? "Weekly";
}

export function familyCallTitle(frequency: FamilyCallFrequency) {
  switch (frequency) {
    case "weekly":
      return "Weekly family call";
    case "biweekly":
      return "Biweekly family call";
    case "monthly":
      return "Monthly family call";
    default:
      return "Family call";
  }
}

export function familyCallPeriodNoun(frequency: FamilyCallFrequency) {
  switch (frequency) {
    case "weekly":
      return "week";
    case "biweekly":
      return "two-week stretch";
    case "monthly":
      return "month";
    default:
      return "period";
  }
}

export function familyCallSetupHeading(frequency: FamilyCallFrequency, rescheduling: boolean) {
  if (frequency === "none") return "";
  const rhythm = familyCallFrequencyLabel(frequency).toLowerCase();
  return rescheduling ? `Change ${rhythm} family calls` : `Set up ${rhythm} family calls`;
}

export function familyCallReminderSource(frequency: FamilyCallFrequency = DEFAULT_FAMILY_CALL_FREQUENCY) {
  switch (frequency) {
    case "weekly":
      return "Weekly Family Call from Familyr";
    case "biweekly":
      return "Biweekly Family Call from Familyr";
    case "monthly":
      return "Monthly Family Call from Familyr";
    default:
      return "Family Call from Familyr";
  }
}
