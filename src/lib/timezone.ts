const GEO_TZ_KEY = "hearth-geo-timezone";

export const TIMEZONE_AUTO = "auto";

export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function formatTimezoneLabel(tz: string): string {
  if (tz === TIMEZONE_AUTO) return "Use device & location";
  try {
    const now = new Date();
    const offset = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName")?.value;
    const city = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
    return offset ? `${city} (${offset})` : city;
  } catch {
    return tz;
  }
}

export const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Kolkata",
  "Australia/Sydney",
  "UTC",
] as const;

export function readGeoTimezone(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(GEO_TZ_KEY);
}

/** Try geolocation + coordinate lookup; falls back silently. */
export async function refreshGeoTimezone(): Promise<string | null> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) return null;

  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 6000,
        maximumAge: 60 * 60 * 1000,
      });
    });
    const url = `https://timeapi.io/api/TimeZone/coordinate?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { timeZone?: string };
    if (!data.timeZone) return null;
    sessionStorage.setItem(GEO_TZ_KEY, data.timeZone);
    return data.timeZone;
  } catch {
    return null;
  }
}

export function resolveTimezone(setting: string): string {
  if (setting !== TIMEZONE_AUTO) return setting;
  return readGeoTimezone() ?? getDeviceTimezone();
}
