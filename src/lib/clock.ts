/** Demo clock is pinned to HackGT week so seed stories stay consistent. */
export const DEMO_NOW = new Date("2026-09-25T20:16:00-04:00");

/** Stable IANA zone for demo-relative dates and SSR-safe time formatting. */
export const DEMO_TIMEZONE = "America/New_York";

/** Single source of truth for demo-relative time. */
export function now() {
  return DEMO_NOW.toISOString();
}

export function calendarAnchor(demo: boolean) {
  return demo ? DEMO_NOW : new Date();
}

export function atDay(daysAgo: number, hour = 10, minute = 0) {
  const d = new Date(DEMO_NOW);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

type FormatOpts = { timeZone?: string; hour12?: boolean };

function tz(opts?: FormatOpts) {
  return opts?.timeZone ?? DEMO_TIMEZONE;
}

type DateParts = {
  weekday: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  dayPeriod: string;
};

function readParts(d: Date, timeZone: string, withDate: boolean, hour12 = true): DateParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    ...(withDate ? { month: "short", day: "numeric" } : {}),
    hour: "numeric",
    minute: "2-digit",
    hour12,
    timeZone,
  });
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(d)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  return {
    weekday: bag.weekday ?? "",
    month: bag.month ?? "",
    day: bag.day ?? "",
    hour: bag.hour ?? "",
    minute: bag.minute ?? "",
    dayPeriod: bag.dayPeriod ?? "",
  };
}

function formatTimeParts(p: DateParts, hour12 = true) {
  if (hour12) return `${p.hour}:${p.minute} ${p.dayPeriod}`.trim();
  return `${p.hour}:${p.minute}`;
}

/** Join date + time with a fixed separator - stable across Node SSR and browsers. */
export function formatDateAtTime(
  d: Date,
  timeZone: string,
  dateStyle: "short" | "weekday-only" = "short",
  hour12 = true,
) {
  const p = readParts(d, timeZone, dateStyle === "short", hour12);
  const time = formatTimeParts(p, hour12);
  if (dateStyle === "weekday-only") return `${p.weekday} at ${time}`;
  return `${p.weekday}, ${p.month} ${p.day} at ${time}`;
}

export function formatTimeOnly(iso: string, opts?: FormatOpts) {
  const hour12 = opts?.hour12 ?? true;
  return formatTimeParts(readParts(new Date(iso), tz(opts), false, hour12), hour12);
}

export function formatWhen(iso: string, opts?: FormatOpts) {
  const hour12 = opts?.hour12 ?? true;
  return formatDateAtTime(new Date(iso), tz(opts), "short", hour12);
}

/** YYYY-MM-DD in a fixed zone - stable across SSR and client. */
export function dateKey(iso: string, timeZone = DEMO_TIMEZONE) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone });
}

export function weekdayName(iso: string, timeZone = DEMO_TIMEZONE) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long", timeZone }).toLowerCase();
}

export function hourInTimezone(iso: string, timeZone = DEMO_TIMEZONE) {
  const hour = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone,
  }).format(new Date(iso));
  return Number(hour);
}

export function dayOfWeekInTimezone(iso: string, timeZone = DEMO_TIMEZONE) {
  const names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return names.indexOf(weekdayName(iso, timeZone));
}

export function addDays(from: Date, days: number) {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

export function formatDay(iso: string, opts?: FormatOpts) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: tz(opts),
  });
}

export function formatTime(iso: string, opts?: FormatOpts) {
  return formatTimeOnly(iso, opts);
}

export function formatMonthYear(date: Date, opts?: FormatOpts) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: tz(opts),
  });
}

export function formatLongDate(iso: string, opts?: FormatOpts) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: tz(opts),
  });
}

export function startOfWeek(from = DEMO_NOW) {
  const d = new Date(from);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
