import { parseEvent } from "./calendar-parse";
import { dateKey, formatTime, weekdayName } from "./clock";
import type { CalendarEvent, FamilyId, Member, MemberId } from "./types";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

/** Demo draft - lands within 2h of Sofia's Saturday soccer in the Alvarez seed calendar. */
export const SCHEDULE_CONFLICT_DEMO_DRAFT = "Family brunch Saturday at 11 AM";

const DAY_RE = /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
const TIME_RE = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
const TIME_WORD_RE = /\b(morning|afternoon|evening|night|noon)\b/i;

/** True when the draft has enough day + time clues to compare schedules. */
export function hasScheduleClues(text: string): boolean {
  const lower = text.toLowerCase();
  const hasDay = DAY_RE.test(lower) || lower.includes("next week");
  const hasTime = TIME_RE.test(lower) || TIME_WORD_RE.test(lower);
  return hasDay && hasTime;
}

function eventOwnerName(event: CalendarEvent, members: Member[]): string {
  const hay = `${event.title} ${event.sourceText}`.toLowerCase();
  for (const member of members) {
    const first = member.name.split(" ")[0];
    if (hay.includes(first.toLowerCase())) return first;
  }
  if (event.attendees.length === 1) {
    const sole = members.find((m) => m.id === event.attendees[0]);
    if (sole) return sole.name.split(" ")[0];
  }
  const creator = members.find((m) => m.id === event.createdBy);
  return creator?.name.split(" ")[0] ?? "Someone";
}

function shortEventLabel(title: string): string {
  const stripped = title.replace(/^[^']+'s\s+/i, "").trim() || title;
  const first = stripped.split(/\s+/)[0] ?? stripped;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

export type ScheduleConflict = {
  event: CalendarEvent;
  memberName: string;
  label: string;
  when: string;
  message: string;
};

export function findScheduleConflicts(
  draftText: string,
  events: CalendarEvent[],
  members: Member[],
  createdBy: MemberId,
  familyId: FamilyId,
  anchor: Date,
  timeZone: string,
): ScheduleConflict[] {
  const text = draftText.trim();
  if (!text || !hasScheduleClues(text)) return [];

  const draft = parseEvent(text, members, createdBy, familyId, anchor);
  const draftStart = new Date(draft.startsAt).getTime();
  const draftDay = dateKey(draft.startsAt, timeZone);

  const conflicts: ScheduleConflict[] = [];
  for (const event of events) {
    if (dateKey(event.startsAt, timeZone) !== draftDay) continue;
    const eventStart = new Date(event.startsAt).getTime();
    if (Math.abs(draftStart - eventStart) > TWO_HOURS_MS) continue;

    const memberName = eventOwnerName(event, members);
    const label = shortEventLabel(event.title);
    const time = formatTime(event.startsAt, { timeZone });
    const day = weekdayName(event.startsAt, timeZone);
    const capitalizeDay = day.charAt(0).toUpperCase() + day.slice(1);
    const when = `${time} on ${capitalizeDay}`;
    const message = `${memberName} already has ${label} at ${when}`;

    conflicts.push({ event, memberName, label, when, message });
  }

  return conflicts.sort(
    (a, b) => new Date(a.event.startsAt).getTime() - new Date(b.event.startsAt).getTime(),
  );
}

export function conflictWarningText(conflicts: ScheduleConflict[]): string | null {
  if (!conflicts.length) return null;
  const first = conflicts[0];
  const extra = conflicts.length > 1 ? ` (+${conflicts.length - 1} more)` : "";
  return `${first.message}${extra}`;
}
