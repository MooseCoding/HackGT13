import { DEMO_NOW } from "./clock";
import type { CalendarEvent, Member } from "./types";

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function nextWeekday(name: string, from = DEMO_NOW) {
  const target = DAY_NAMES.indexOf(name);
  const d = new Date(from);
  const diff = (target - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + (diff === 0 && d.getHours() > 12 ? 7 : diff));
  return d;
}

export function parseEvent(raw: string, members: Member[], createdBy: string, familyId: string): CalendarEvent {
  const text = raw.trim();
  const lower = text.toLowerCase();
  let day = new Date(DEMO_NOW);
  for (const name of DAY_NAMES) {
    if (lower.includes(name)) {
      day = nextWeekday(name);
      break;
    }
  }
  if (lower.includes("tomorrow")) {
    day = new Date(DEMO_NOW);
    day.setDate(day.getDate() + 1);
  }
  if (lower.includes("today")) day = new Date(DEMO_NOW);

  const time = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  let hour = 10;
  let minute = 0;
  if (time) {
    hour = Number(time[1]) % 12;
    if (time[3].toLowerCase() === "pm") hour += 12;
    minute = Number(time[2] || 0);
  }
  day.setHours(hour, minute, 0, 0);

  const attendees = members
    .filter((m) => lower.includes(m.name.split(" ")[0].toLowerCase()) || lower.includes(m.role.toLowerCase()))
    .map((m) => m.id);
  if (!attendees.includes(createdBy)) attendees.push(createdBy);

  const locMatch = text
    .replace(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/gi, "")
    .match(/\bat\s+([^,.]+)/i);
  let title = text.replace(/\b(this|next|on)\s+/gi, "").trim();
  if (title.length > 72) title = title.slice(0, 69) + "…";

  return {
    id: `evt-${Date.now()}`,
    familyId,
    title,
    startsAt: day.toISOString(),
    location: locMatch?.[1]?.trim(),
    attendees,
    sourceText: text,
    createdBy,
  };
}
