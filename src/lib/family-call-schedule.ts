import { inCalendarWindow } from "./calendar-window";
import {
  DEFAULT_FAMILY_CALL_FREQUENCY,
  familyCallReminderSource,
  familyCallTitle,
  parseFamilyCallFrequency,
  type FamilyCallFrequency,
} from "./family-call-frequency";
import type { CalendarEvent, Member } from "./types";

/** @deprecated use hearth:family-call:* sources; kept for seeded rows */
export const FAMILY_CALL_SOURCE = "hearth:weekly-family-call";
export const FAMILY_CALL_TITLE = "Weekly family call";
export const CALL_MINUTES = 45;
const BUFFER_MS = 15 * 60_000;
const DEFAULT_WEEKS = 4;

export function familyCallSource(frequency: FamilyCallFrequency) {
  return frequency === "none" ? "hearth:family-call:none" : `hearth:family-call:${frequency}`;
}

export function isFamilyCall(event: CalendarEvent) {
  if (event.sourceText?.startsWith("hearth:family-call:")) return true;
  return event.sourceText === FAMILY_CALL_SOURCE || /family call/i.test(event.title);
}

export function familyCallSourceLabel(sourceText: string) {
  if (sourceText === FAMILY_CALL_SOURCE) return familyCallReminderSource("weekly");
  if (sourceText.startsWith("hearth:family-call:")) {
    return familyCallReminderSource(parseFamilyCallFrequency(sourceText.slice("hearth:family-call:".length)));
  }
  return null;
}

/** @deprecated use isFamilyCall */
export const isWeeklyFamilyCall = isFamilyCall;

function eventRange(event: CalendarEvent) {
  const start = new Date(event.startsAt).getTime();
  const end = event.endsAt ? new Date(event.endsAt).getTime() : start + 60 * 60_000;
  return { start, end };
}

function overlapsBusy(start: number, end: number, busy: { start: number; end: number }[]) {
  return busy.some((b) => start < b.end && end > b.start);
}

type WindowPref = { days: number[]; hours: number[]; bonus: number };

const WINDOWS: WindowPref[] = [
  { days: [0], hours: [16, 17, 18], bonus: 40 },
  { days: [6], hours: [16, 17, 18], bonus: 32 },
  { days: [0, 6], hours: [10, 11], bonus: 22 },
  { days: [3], hours: [18, 19], bonus: 18 },
  { days: [2, 4], hours: [18, 19], bonus: 12 },
  { days: [1, 5], hours: [18], bonus: 8 },
];

function startOfLocalDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function weekKey(d: Date) {
  const s = startOfLocalDay(d);
  const diff = (s.getDay() + 6) % 7;
  s.setDate(s.getDate() - diff);
  return `w-${s.getFullYear()}-${s.getMonth()}-${s.getDate()}`;
}

function periodKey(d: Date, frequency: FamilyCallFrequency, anchor: Date) {
  if (frequency === "weekly") return weekKey(d);
  if (frequency === "biweekly") {
    const days = Math.floor((startOfLocalDay(d).getTime() - startOfLocalDay(anchor).getTime()) / 86_400_000);
    return `b-${Math.floor(days / 14)}`;
  }
  if (frequency === "monthly") return `m-${d.getFullYear()}-${d.getMonth()}`;
  return "";
}

type Candidate = {
  start: Date;
  end: Date;
  weekday: number;
  hour: number;
  score: number;
  period: string;
};

function candidatesForRange(anchor: Date, weeks: number, busy: { start: number; end: number }[]) {
  const soonest = new Date(anchor.getTime() + 30 * 60_000);
  const last = addDays(startOfLocalDay(anchor), weeks * 7);
  const out: Candidate[] = [];

  for (let day = startOfLocalDay(addDays(anchor, 0)); day < last; day = addDays(day, 1)) {
    for (const win of WINDOWS) {
      if (!win.days.includes(day.getDay())) continue;
      for (const hour of win.hours) {
        const start = new Date(day);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(start.getTime() + CALL_MINUTES * 60_000);
        if (start < soonest || end > last) continue;
        if (overlapsBusy(start.getTime() - BUFFER_MS, end.getTime() + BUFFER_MS, busy)) continue;
        const elderFriendly = hour >= 10 && hour <= 19 ? 6 : 0;
        out.push({
          start,
          end,
          weekday: start.getDay(),
          hour,
          score: win.bonus + elderFriendly,
          period: "",
        });
      }
    }
  }
  return out;
}

export function proposeFamilyCalls(
  events: CalendarEvent[],
  opts: {
    familyId: string;
    createdBy: string;
    members: Member[];
    anchor: Date;
    weeks?: number;
    frequency?: FamilyCallFrequency;
  },
): CalendarEvent[] {
  const frequency = opts.frequency ?? DEFAULT_FAMILY_CALL_FREQUENCY;
  if (frequency === "none") return [];

  const weeks = opts.weeks ?? DEFAULT_WEEKS;
  const existingCalls = events.filter(isFamilyCall);
  const covered = new Set(
    existingCalls.map((e) => periodKey(new Date(e.startsAt), frequency, opts.anchor)).filter(Boolean),
  );
  const busy = events
    .filter((e) => !isFamilyCall(e))
    .map((e) => {
      const r = eventRange(e);
      return { start: r.start - BUFFER_MS, end: r.end + BUFFER_MS };
    });

  const free = candidatesForRange(opts.anchor, weeks, busy)
    .map((c) => ({ ...c, period: periodKey(c.start, frequency, opts.anchor) }))
    .filter((c) => c.period && !covered.has(c.period));
  if (!free.length) return [];

  const byPattern = new Map<string, Candidate[]>();
  for (const c of free) {
    const key = `${c.weekday}-${c.hour}`;
    const list = byPattern.get(key) ?? [];
    list.push(c);
    byPattern.set(key, list);
  }

  const bestPattern = [...byPattern.entries()].sort((a, b) => {
    const scoreA = a[1].reduce((s, c) => s + c.score, 0) + a[1].length * 20;
    const scoreB = b[1].reduce((s, c) => s + c.score, 0) + b[1].length * 20;
    return scoreB - scoreA;
  })[0];

  const chosen: Candidate[] = [];
  const usedPeriods = new Set<string>(covered);
  if (bestPattern) {
    for (const c of bestPattern[1].sort((a, b) => a.start.getTime() - b.start.getTime())) {
      if (usedPeriods.has(c.period)) continue;
      chosen.push(c);
      usedPeriods.add(c.period);
    }
  }

  chosen.sort((a, b) => a.start.getTime() - b.start.getTime());
  const title = familyCallTitle(frequency);
  const sourceText = familyCallSource(frequency);

  return chosen
    .filter((c) => inCalendarWindow(c.start.toISOString(), opts.anchor))
    .map((c, i) => ({
      id: `evt-f-call-${c.start.getTime()}-${i}`,
      familyId: opts.familyId,
      title,
      startsAt: c.start.toISOString(),
      endsAt: c.end.toISOString(),
      location: "Family video call",
      attendees: opts.members.map((m) => m.id),
      sourceText,
      createdBy: opts.createdBy,
      calendarScope: "family" as const,
    }));
}

/** @deprecated use proposeFamilyCalls */
export function proposeWeeklyFamilyCalls(
  events: CalendarEvent[],
  opts: {
    familyId: string;
    createdBy: string;
    members: Member[];
    anchor: Date;
    weeks?: number;
    frequency?: FamilyCallFrequency;
  },
) {
  return proposeFamilyCalls(events, opts);
}

export function proposalCopy(event: CalendarEvent) {
  const start = new Date(event.startsAt);
  const when = start.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${when} · ${time}`;
}

export function consistentSlotLabel(events: CalendarEvent[]) {
  if (!events.length) return "";
  const first = new Date(events[0].startsAt);
  const weekday = first.toLocaleDateString("en-US", { weekday: "long" });
  const time = first.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const same = events.every((e) => {
    const d = new Date(e.startsAt);
    return d.getDay() === first.getDay() && d.getHours() === first.getHours();
  });
  return same ? `Usually ${weekday}s at ${time}` : "Open times we found";
}
