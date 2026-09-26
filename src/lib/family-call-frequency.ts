export type FamilyCallFrequency = "weekly" | "biweekly" | "monthly" | "none";

export const DEFAULT_FAMILY_CALL_FREQUENCY: FamilyCallFrequency = "weekly";

export const FAMILY_CALL_FREQUENCY_OPTIONS: ReadonlyArray<{
  value: FamilyCallFrequency;
  label: string;
}> = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "none", label: "Off" },
];

export function familyCallFrequencyLabel(freq: FamilyCallFrequency): string {
  switch (freq) {
    case "weekly":
      return "Weekly";
    case "biweekly":
      return "Biweekly";
    case "monthly":
      return "Monthly";
    case "none":
      return "Off";
  }
}

/** Singular period noun; CalendarBoard appends "es" for plurals. */
export function familyCallPeriodNoun(freq: FamilyCallFrequency): string {
  switch (freq) {
    case "weekly":
      return "week";
    case "biweekly":
      return "biweek";
    case "monthly":
      return "month";
    case "none":
      return "period";
  }
}

export function familyCallSetupHeading(freq: FamilyCallFrequency, hasExistingCalls: boolean): string {
  const rhythm = familyCallFrequencyLabel(freq).toLowerCase();
  if (freq === "none") return "Family calls are off";
  if (hasExistingCalls) return `Add missing ${rhythm} family calls`;
  return `Set up ${rhythm} family calls`;
}

export function familyCallTitle(freq: FamilyCallFrequency): string {
  switch (freq) {
    case "weekly":
      return "Weekly family call";
    case "biweekly":
      return "Biweekly family call";
    case "monthly":
      return "Monthly family call";
    case "none":
      return "Family call";
  }
}
