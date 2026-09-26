import { analyzeCalendarText, cleanEventTitle } from "./local-ml";
import type { CalendarEvent, Member } from "./types";

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const RELATIVE_DAYS: Record<string, number> = {
  today: 0,
  tomorrow: 1,
  "day after tomorrow": 2,
};

function nextWeekday(name: string, from: Date) {
  const target = DAY_NAMES.indexOf(name);
  const d = new Date(from);
  const diff = (target - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + (diff === 0 && d.getHours() > 12 ? 7 : diff));
  return d;
}

export function exampleEventText(anchor = new Date()) {
  const d = new Date(anchor);
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  return `Sofia has her soccer tournament this ${d.toLocaleDateString("en-US", { weekday: "long" })} at 10 AM at Piedmont Park`;
}

export function previewEvent(raw: string) {
  if (!raw.trim()) return null;
  return analyzeCalendarText(raw);
}

export function parseEvent(
  raw: string,
  members: Member[],
  createdBy: string,
  familyId: string,
  anchor = new Date(),
): CalendarEvent {
  const text = raw.trim();
  const lower = text.toLowerCase();
  const hint = analyzeCalendarText(text);

  let day = new Date(anchor);
  for (const name of DAY_NAMES) {
    if (new RegExp(`\\b${name}\\b`).test(lower)) {
      day = nextWeekday(name, anchor);
      break;
    }
  }
  for (const [phrase, offset] of Object.entries(RELATIVE_DAYS)) {
    if (lower.includes(phrase)) {
      day = new Date(anchor);
      day.setDate(day.getDate() + offset);
      break;
    }
  }
  if (lower.includes("next week")) {
    day = new Date(anchor);
    day.setDate(day.getDate() + 7);
  }

  const time = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  let hour = hint.eventType === "appointment" ? 9 : hint.eventType === "social" ? 18 : 10;
  let minute = 0;
  if (time) {
    hour = Number(time[1]) % 12;
    if (time[3].toLowerCase() === "pm") hour += 12;
    minute = Number(time[2] || 0);
  }
  if (/\bmorning\b/.test(lower) && !time) {
    hour = 9;
  }
  if (/\b(afternoon|evening|night)\b/.test(lower) && !time) {
    hour = lower.includes("night") ? 19 : 15;
  }
  if (/\bnoon\b/.test(lower)) {
    hour = 12;
    minute = 0;
  }

  day.setHours(hour, minute, 0, 0);
  const endsAt = new Date(day);
  endsAt.setHours(endsAt.getHours() + hint.durationHours);

  const attendees = members
    .filter(
      (m) =>
        lower.includes(m.name.split(" ")[0].toLowerCase()) ||
        lower.includes(m.role.toLowerCase()) ||
        (hint.eventType === "appointment" && /grandma|grandpa|abuela|abuelo|elder/i.test(m.role)),
    )
    .map((m) => m.id);
  if (!attendees.includes(createdBy)) attendees.push(createdBy);

  const locMatch = text
    .replace(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/gi, "")
    .match(/\bat\s+([^,.]+)/i);
  const title = cleanEventTitle(text, hint);

  return {
    id: `evt-${Date.now()}`,
    familyId,
    title,
    startsAt: day.toISOString(),
    endsAt: endsAt.toISOString(),
    location: locMatch?.[1]?.trim(),
    attendees,
    sourceText: text,
    createdBy,
  };
}
