import { formatWhen } from "./clock";
import { familyCallSourceLabel } from "./family-call-schedule";
import type { Member, Reminder } from "./types";

export type ReminderSuggestion = {
  text: string;
  assigneeId: string;
  dueAt?: string;
  dueHint: string;
  sourceText: string;
};

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const TIME_RE = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
const DAY_RE = /\b(today|tomorrow|this weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;

const REMIND_CUE_RE =
  /\b(remind(?:\s+\w+)?\s+to|reminder:?|don'?t forget|can you pick up|can someone|mijo,?\s*can you|can you bring|can you call|please bring|make sure|tell\s+\w+\s+to)\b/i;
const TASK_CUE_RE = /\b(pick up|bring|call|check on|grab|get the|wear the|drive)\b/i;

const RELATIVE_DAYS: Record<string, number> = {
  today: 0,
  tomorrow: 1,
};

function nextWeekday(name: string, from: Date) {
  const target = DAY_NAMES.indexOf(name);
  const d = new Date(from);
  const diff = (target - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + (diff === 0 && d.getHours() > 12 ? 7 : diff));
  return d;
}

function parseDue(raw: string, anchor = new Date()): { dueAt?: string; dueHint: string } {
  const lower = raw.toLowerCase();
  let day = new Date(anchor);
  let dueHint = "soon";

  if (lower.includes("this weekend")) {
    const sat = new Date(anchor);
    const daysUntilSat = (6 - sat.getDay() + 7) % 7 || 7;
    sat.setDate(sat.getDate() + daysUntilSat);
    day = sat;
    dueHint = "this weekend";
  } else {
    for (const [phrase, offset] of Object.entries(RELATIVE_DAYS)) {
      if (lower.includes(phrase)) {
        day = new Date(anchor);
        day.setDate(day.getDate() + offset);
        dueHint = phrase;
        break;
      }
    }
    for (const name of DAY_NAMES) {
      if (new RegExp(`\\b${name}\\b`).test(lower)) {
        day = nextWeekday(name, anchor);
        dueHint = name.charAt(0).toUpperCase() + name.slice(1);
        break;
      }
    }
  }

  const time = lower.match(TIME_RE);
  let hour = 12;
  let minute = 0;
  if (time) {
    hour = Number(time[1]) % 12;
    if (time[3].toLowerCase() === "pm") hour += 12;
    minute = Number(time[2] || 0);
    day.setHours(hour, minute, 0, 0);
    dueHint = `${dueHint} ${time[0]}`.trim();
    return { dueAt: day.toISOString(), dueHint };
  }

  if (/\bmorning\b/.test(lower)) {
    day.setHours(9, 0, 0, 0);
    dueHint = `${dueHint} morning`.trim();
    return { dueAt: day.toISOString(), dueHint };
  }

  day.setHours(17, 0, 0, 0);
  return { dueAt: day.toISOString(), dueHint };
}

function firstName(member: Member) {
  return member.name.split(" ")[0];
}

function findAssignee(raw: string, members: Member[], authorId: string): string | null {
  const lower = raw.toLowerCase();

  // "Remind me / myself to …" → the person asking.
  if (/\bremind\s+(me|myself)\s+to\b/.test(lower) || /\breminder\s+for\s+me\b/.test(lower)) {
    return authorId;
  }

  const remindTo = lower.match(/\bremind\s+(\w+)\s+to\b/);
  if (remindTo) {
    const who = remindTo[1].toLowerCase();
    if (who === "me" || who === "myself") return authorId;
    const m = members.find((x) => firstName(x).toLowerCase() === who);
    if (m) return m.id;
  }

  if (/\bmijo\b/i.test(raw)) {
    const miguel = members.find((m) => firstName(m).toLowerCase() === "miguel");
    if (miguel) return miguel.id;
  }

  for (const m of members) {
    const first = firstName(m).toLowerCase();
    if (lower.includes(first) && /\b(can you|could you|please|mijo)\b/i.test(raw)) {
      return m.id;
    }
  }

  const tellMatch = lower.match(/\btell\s+(\w+)\s+to\b/);
  if (tellMatch) {
    const m = members.find((x) => firstName(x).toLowerCase() === tellMatch[1].toLowerCase());
    if (m) return m.id;
  }

  if (/\bI(?:'ll| will)\b/i.test(raw)) {
    return authorId;
  }

  // Bare "reminder: …" / "don't forget …" with a day → assign to the author.
  if (/\b(reminder:|don'?t forget)\b/.test(lower) && DAY_RE.test(lower)) {
    return authorId;
  }

  return null;
}

function extractReminderText(raw: string): string {
  let text = raw.trim();
  text = text.replace(/^reminder:\s*/i, "");
  text = text.replace(/^remind\s+\w+\s+to\s+/i, "");
  text = text.replace(/^(don'?t forget(?:\s+to)?|please|can you|could you)\s+/i, "");
  text = text.replace(/\?\s*$/, "").trim();

  if (/\bdrive\s+\w+/i.test(text)) {
    const drive = text.match(/I(?:'ll| will)\s+(drive\s+\w+)/i);
    if (drive) return capitalize(drive[1]);
  }
  if (/\bpick up\b/i.test(text)) {
    const pick = text.match(/pick up\s+([^?.!,]+)/i);
    if (pick) return `Pick up ${pick[1].trim()}`;
  }
  if (/\bbring\b/i.test(text)) {
    const bring = text.match(/bring\s+([^?.!,]+)/i);
    if (bring) return `Bring ${bring[1].trim()}`;
  }
  if (/\bcall\b/i.test(text)) {
    const call = text.match(/call\s+([^?.!,]+)/i);
    if (call) {
      const target = call[1]
        .replace(DAY_RE, "")
        .replace(TIME_RE, "")
        .replace(/\b(this weekend|morning|afternoon|evening|night)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      if (target) return `Call ${target}`;
    }
  }
  if (/\bwear the\b/i.test(text)) {
    const scarf = text.match(/wear the\s+([^?.!,]+)/i);
    if (scarf) return `Wear the ${scarf[1].trim()}`;
  }

  return text.length > 72 ? `${text.slice(0, 69)}…` : text;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function looksLikeReminderText(text: string): boolean {
  const raw = text.trim();
  if (raw.length < 6) return false;
  const hasRemindCue = REMIND_CUE_RE.test(raw);
  const hasTaskCue = TASK_CUE_RE.test(raw);
  const hasDay = DAY_RE.test(raw);
  return hasRemindCue || (hasTaskCue && (hasDay || /\b(can you|could you|please|mijo)\b/i.test(raw)));
}

/** Lightweight text → household reminder suggestion (no external AI). */
export function suggestReminderFromText(
  text: string,
  members: Member[],
  authorId: string,
  anchor = new Date(),
): ReminderSuggestion | null {
  const raw = text.trim();
  if (raw.length < 6) return null;

  const hasRemindCue = REMIND_CUE_RE.test(raw);
  const hasTaskCue = TASK_CUE_RE.test(raw);
  const hasDay = DAY_RE.test(raw);

  if (!hasRemindCue && !(hasTaskCue && (hasDay || /\b(can you|could you|please|mijo)\b/i.test(raw)))) {
    return null;
  }

  const assigneeId = findAssignee(raw, members, authorId);
  if (!assigneeId) return null;

  const { dueAt, dueHint } = parseDue(raw, anchor);
  const reminderText = extractReminderText(raw);
  if (reminderText.length < 4) return null;

  return {
    text: reminderText,
    assigneeId,
    dueAt,
    dueHint,
    sourceText: raw,
  };
}

/** Format due for display */
export function formatReminderDue(reminder: Reminder) {
  if (reminder.dueAt) return formatWhen(reminder.dueAt);
  return reminder.dueHint;
}

/** Human-readable attribution for reminder quotes (e.g. hearth calendar tokens). */
export function formatReminderSource(sourceText: string) {
  const hearthLabel = familyCallSourceLabel(sourceText);
  if (hearthLabel) return hearthLabel;
  return sourceText;
}

export function isHearthReminderSource(sourceText: string) {
  return familyCallSourceLabel(sourceText) !== null;
}
