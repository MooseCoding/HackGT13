import { formatWhen } from "./clock";
import type { CalendarEvent, Member } from "./types";

/** Demo personal ("mine") events for the Alvarez circle — privacy theater for scheduling. */
export const alvarezPersonalEvents: CalendarEvent[] = [
  {
    id: "evt-m-miguel-yard",
    familyId: "alvarez",
    title: "Yard cleanup with neighbors",
    startsAt: "2026-09-27T16:00:00-04:00",
    endsAt: "2026-09-27T18:00:00-04:00",
    location: "Inman Park",
    attendees: ["miguel"],
    sourceText: "demo personal · Miguel busy Sunday afternoon",
    createdBy: "miguel",
    calendarScope: "mine",
    isGoogleSynced: true,
  },
  {
    id: "evt-m-priya-clinic",
    familyId: "alvarez",
    title: "Clinic shift handover",
    startsAt: "2026-09-27T15:30:00-04:00",
    endsAt: "2026-09-27T17:30:00-04:00",
    location: "Emory Midtown",
    attendees: ["priya"],
    sourceText: "demo personal · Priya overlaps Sunday call window",
    createdBy: "priya",
    calendarScope: "mine",
    isGoogleSynced: true,
  },
  {
    id: "evt-m-sofia-study",
    familyId: "alvarez",
    title: "Study group",
    startsAt: "2026-09-26T15:00:00-04:00",
    endsAt: "2026-09-26T17:00:00-04:00",
    location: "Grady High library",
    attendees: ["sofia"],
    sourceText: "demo personal · Sofia Saturday study",
    createdBy: "sofia",
    calendarScope: "mine",
    isGoogleSynced: true,
  },
  {
    id: "evt-m-james-lab",
    familyId: "alvarez",
    title: "Lab hours",
    startsAt: "2026-09-29T14:00:00-04:00",
    endsAt: "2026-09-29T16:30:00-04:00",
    location: "Georgia Tech",
    attendees: ["james"],
    sourceText: "demo personal · James weekday lab",
    createdBy: "james",
    calendarScope: "mine",
    isGoogleSynced: true,
  },
  {
    id: "evt-m-elena-walk",
    familyId: "alvarez",
    title: "Neighborhood walk",
    startsAt: "2026-09-28T09:00:00-04:00",
    endsAt: "2026-09-28T10:00:00-04:00",
    location: "Grant Park",
    attendees: ["elena"],
    sourceText: "demo personal · Elena morning walk",
    createdBy: "elena",
    calendarScope: "mine",
    isGoogleSynced: true,
  },
  {
    id: "evt-m-miguel-dentist",
    familyId: "alvarez",
    title: "Dentist checkup",
    startsAt: "2026-09-30T11:00:00-04:00",
    endsAt: "2026-09-30T12:00:00-04:00",
    location: "Inman Park Dental",
    attendees: ["miguel"],
    sourceText: "demo personal · Miguel dentist",
    createdBy: "miguel",
    calendarScope: "mine",
    isGoogleSynced: true,
  },
];

export function decorateDemoPersonalEvents(events: CalendarEvent[]): CalendarEvent[] {
  const byId = new Map(alvarezPersonalEvents.map((e) => [e.id, e]));
  const known = new Set(events.map((e) => e.id));
  const merged = events.map((e) => {
    if (e.calendarScope === "mine" || byId.has(e.id)) {
      return { ...e, isGoogleSynced: true, calendarScope: e.calendarScope ?? "mine" };
    }
    return e;
  });
  for (const personal of alvarezPersonalEvents) {
    if (!known.has(personal.id)) merged.push({ ...personal, isGoogleSynced: true });
  }
  return merged.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export type PersonalCalendarRow = {
  memberName: string;
  title: string;
  when: string;
  conflictsSundayCall: boolean;
};

/** Preferred family-call window: Sunday 4–6pm local (matches schedule scorer). */
function overlapsSundayCallWindow(startsAt: string, endsAt?: string) {
  const start = new Date(startsAt);
  if (start.getDay() !== 0) return false;
  const end = endsAt ? new Date(endsAt) : new Date(start.getTime() + 60 * 60_000);
  const winStart = new Date(start);
  winStart.setHours(16, 0, 0, 0);
  const winEnd = new Date(start);
  winEnd.setHours(18, 0, 0, 0);
  return start.getTime() < winEnd.getTime() && end.getTime() > winStart.getTime();
}

export function personalCalendarRows(
  events: CalendarEvent[],
  members: Member[],
  _anchor: Date,
): PersonalCalendarRow[] {
  const nameById = Object.fromEntries(members.map((m) => [m.id, m.name.split(" ")[0] ?? m.name]));
  return events
    .filter((e) => e.calendarScope === "mine" || e.isGoogleSynced)
    .filter((e) => e.familyId === "alvarez" || members.some((m) => m.id === e.createdBy))
    .map((e) => ({
      memberName: nameById[e.createdBy] ?? nameById[e.attendees[0]] ?? "Someone",
      title: e.title,
      when: formatWhen(e.startsAt),
      conflictsSundayCall: overlapsSundayCallWindow(e.startsAt, e.endsAt),
    }))
    .sort((a, b) => Number(b.conflictsSundayCall) - Number(a.conflictsSundayCall));
}
