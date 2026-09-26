import { DEMO_NOW } from "./clock";

export const CAL_WEEKS = 5;

export function windowBounds(from = DEMO_NOW) {
  const min = new Date(from);
  min.setDate(min.getDate() - CAL_WEEKS * 7);
  const max = new Date(from);
  max.setDate(max.getDate() + CAL_WEEKS * 7);
  return { min, max };
}

export function inCalendarWindow(iso: string, from = DEMO_NOW) {
  const t = new Date(iso).getTime();
  const { min, max } = windowBounds(from);
  return t >= min.getTime() && t <= max.getTime();
}

export function localDateKey(v: string | Date) {
  const d = typeof v === "string" ? new Date(v) : v;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
