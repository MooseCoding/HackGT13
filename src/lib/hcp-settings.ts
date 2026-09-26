export type HcpReportingMode = "simple" | "advanced";

export const HCP_REPORTING_COOKIE = "hearth-hcp-reporting";
export const DEFAULT_HCP_REPORTING_MODE: HcpReportingMode = "simple";

export type HcpSettings = {
  reportingMode: HcpReportingMode;
};

const STORAGE_KEY = "hearth-hcp-settings";

export function normalizeReportingMode(value: string | undefined | null): HcpReportingMode {
  return value === "advanced" ? "advanced" : "simple";
}

export function defaultHcpSettings(): HcpSettings {
  return { reportingMode: DEFAULT_HCP_REPORTING_MODE };
}

export function loadHcpSettings(): HcpSettings {
  if (typeof window === "undefined") return defaultHcpSettings();

  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<HcpSettings>;
      return { reportingMode: normalizeReportingMode(parsed.reportingMode) };
    } catch {
      // fall through
    }
  }

  return defaultHcpSettings();
}

export function saveHcpSettings(settings: HcpSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/** Sync server-readable reporting mode to cookies. */
export function syncHcpSettingsCookie(mode: HcpReportingMode): void {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${HCP_REPORTING_COOKIE}=${mode};path=/;max-age=${maxAge};samesite=lax`;
}

export const HCP_REPORTING_MODE_LABELS: Record<HcpReportingMode, { label: string; description: string }> = {
  simple: {
    label: "Simple",
    description: "Brief, risk level, and the biggest changes.",
  },
  advanced: {
    label: "Advanced",
    description: "Charts, baseline numbers, and where signals came from.",
  },
};
