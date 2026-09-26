/** Demo clock is pinned to HackGT week so seed stories stay consistent. */
export const DEMO_NOW = new Date("2026-09-25T20:16:00-04:00");

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

type FormatOpts = { timeZone?: string };

export function formatWhen(iso: string, opts?: FormatOpts) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: opts?.timeZone,
  });
}

export function formatDay(iso: string, opts?: FormatOpts) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: opts?.timeZone,
  });
}

export function formatTime(iso: string, opts?: FormatOpts) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: opts?.timeZone,
  });
}

export function formatMonthYear(date: Date, opts?: FormatOpts) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: opts?.timeZone,
  });
}

export function formatLongDate(iso: string, opts?: FormatOpts) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: opts?.timeZone,
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
