export type ThemeSetting = "light" | "dark" | "system";
export type TimeFormat = "12h" | "24h";
export type HestiaGeneration = "auto" | "local";

export type HearthSettings = {
  largerText: boolean;
  theme: ThemeSetting;
  timezone: string;
  timeFormat: TimeFormat;
  hestiaGeneration: HestiaGeneration;
};

export type SettingKey = keyof HearthSettings;

export type SettingControl =
  | { type: "boolean" }
  | { type: "select"; options: { value: string; label: string }[] };

export type SettingMeta = {
  label: string;
  description: string;
  group: string;
  control: SettingControl;
};

export const DEFAULT_SETTINGS: HearthSettings = {
  largerText: false,
  theme: "light",
  timezone: "auto",
  timeFormat: "12h",
  hestiaGeneration: "local",
};

export const THEME_OPTIONS: { value: ThemeSetting; label: string }[] = [
  { value: "system", label: "Match device" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export const TIME_FORMAT_OPTIONS: { value: TimeFormat; label: string }[] = [
  { value: "12h", label: "12-hour (3:30 PM)" },
  { value: "24h", label: "24-hour (15:30)" },
];

export const HESTIA_GENERATION_OPTIONS: { value: HestiaGeneration; label: string }[] = [
  { value: "local", label: "Built-in (no tokens)" },
  { value: "auto", label: "AI when available" },
];

export const HESTIA_GENERATION_COOKIE = "hearth-hestia-generation";

export const SETTING_META: Record<SettingKey, SettingMeta> = {
  largerText: {
    label: "Larger text",
    description: "Bigger type and buttons across the app.",
    group: "Accessibility",
    control: { type: "boolean" },
  },
  theme: {
    label: "Theme",
    description: "Light, dark, or follow your device.",
    group: "Display",
    control: {
      type: "select",
      options: THEME_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    },
  },
  timezone: {
    label: "Time zone",
    description: "How dates and times are shown.",
    group: "Regional",
    control: { type: "select", options: [] },
  },
  timeFormat: {
    label: "Time format",
    description: "12-hour or 24-hour clock for times in chat and calendar.",
    group: "Regional",
    control: {
      type: "select",
      options: TIME_FORMAT_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    },
  },
  hestiaGeneration: {
    label: "Hestia generation",
    description:
      "Built-in uses the on-device storyteller. AI mode uses Meta Muse 1.3, or Meta's latest model, when configured.",
    group: "Hestia",
    control: {
      type: "select",
      options: HESTIA_GENERATION_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    },
  },
};

const STORAGE_KEY = "hearth-settings";
const LEGACY_EASY_KEY = "hearth-easy";

export function hasStoredSettings(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) !== null;
}

function normalizeSettings(parsed: Partial<HearthSettings>, fallback?: Partial<HearthSettings>): HearthSettings {
  const theme = parsed.theme;
  const validTheme =
    theme === "light" || theme === "dark" || theme === "system" ? theme : DEFAULT_SETTINGS.theme;

  const timeFormat = parsed.timeFormat;
  const validTimeFormat =
    timeFormat === "12h" || timeFormat === "24h" ? timeFormat : DEFAULT_SETTINGS.timeFormat;

  const hestiaGeneration = parsed.hestiaGeneration;
  const validHestiaGeneration =
    hestiaGeneration === "auto" || hestiaGeneration === "local"
      ? hestiaGeneration
      : DEFAULT_SETTINGS.hestiaGeneration;

  return {
    largerText: Boolean(parsed.largerText ?? fallback?.largerText ?? DEFAULT_SETTINGS.largerText),
    theme: validTheme,
    timezone:
      typeof parsed.timezone === "string" && parsed.timezone.length > 0
        ? parsed.timezone
        : (fallback?.timezone ?? DEFAULT_SETTINGS.timezone),
    timeFormat: validTimeFormat,
    hestiaGeneration: validHestiaGeneration,
  };
}

/** Server-safe defaults — never reads localStorage (use after mount for stored prefs). */
export function defaultSettings(fallback?: Partial<HearthSettings>): HearthSettings {
  return normalizeSettings({}, fallback);
}

export function loadSettings(fallback?: Partial<HearthSettings>): HearthSettings {
  if (typeof window === "undefined") {
    return defaultSettings(fallback);
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<HearthSettings>;
      return normalizeSettings(parsed, fallback);
    } catch {
      // fall through to legacy / defaults
    }
  }

  const legacy = localStorage.getItem(LEGACY_EASY_KEY);
  if (legacy === "1" || legacy === "0") {
    const settings = normalizeSettings({ largerText: legacy === "1" }, fallback);
    saveSettings(settings);
    localStorage.removeItem(LEGACY_EASY_KEY);
    return settings;
  }

  return normalizeSettings({}, fallback);
}

export function saveSettings(settings: HearthSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function isDarkTheme(theme: ThemeSetting): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function hour12FromTimeFormat(format: TimeFormat): boolean {
  return format === "12h";
}

/** Sync server-readable prefs (Hestia generation) to cookies. */
export function syncSettingsCookies(settings: HearthSettings): void {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${HESTIA_GENERATION_COOKIE}=${settings.hestiaGeneration};path=/;max-age=${maxAge};samesite=lax`;
}
