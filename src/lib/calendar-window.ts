import { DEMO_NOW } from "./clock";

/** How many weeks before/after the anchor day the family calendar shows. */
export const CAL_WEEKS = 6;

export function windowBounds(anchor: Date = DEMO_NOW) {
  const min = new Date(anchor);
  min.setDate(min.getDate() - CAL_WEEKS * 7);
  min.setHours(0, 0, 0, 0);
  const max = new Date(anchor);
  max.setDate(max.getDate() + CAL_WEEKS * 7);
  max.setHours(23, 59, 59, 999);
  return { min, max };
}

export function inCalendarWindow(iso: string, anchor: Date = DEMO_NOW) {
  const t = new Date(iso).getTime();
  const { min, max } = windowBounds(anchor);
  return t >= min.getTime() && t <= max.getTime();
}
