import type { Member } from "./types";

export type ReminderSuggestion = {
  assigneeId: string;
  text: string;
  dueAt?: string;
  dueHint: string;
  sourceText: string;
};

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const REMINDER_CUE =
  /\b(reminder:?|remind|don't forget|dont forget|can you|could you|please|make sure|remember to|pick up|bring|drive|tell)\b/i;

function nextWeekday(name: string, from: Date) {
  const target = DAY_NAMES.indexOf(name);
  const d = new Date(from);
  const diff = (target - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
  return d;
}

function parseDue(raw: string, anchor: Date): { dueAt?: string; dueHint: string } {
  const lower = raw.toLowerCase();
  let day: Date | null = null;
  let dayHint = "";

  for (let i = 0; i < DAY_NAMES.length; i++) {
    if (new RegExp(`\\b${DAY_NAMES[i]}\\b`).test(lower)) {
      day = nextWeekday(DAY_NAMES[i], anchor);
      dayHint = DAY_LABELS[i];
      break;
    }
  }
  if (!day && /\btoday\b/.test(lower)) {
    day = new Date(anchor);
    dayHint = "Today";
  }
  if (!day && /\btomorrow\b/.test(lower)) {
    day = new Date(anchor);
    day.setDate(day.getDate() + 1);
    dayHint = "Tomorrow";
  }
  if (!day && /\bthis weekend\b/.test(lower)) {
    day = nextWeekday("saturday", anchor);
    dayHint = "This weekend";
  }

  const time = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  let hour = 10;
  let minute = 0;
  let timeHint = "";
  if (time) {
    hour = Number(time[1]) % 12;
    if (time[3].toLowerCase() === "pm") hour += 12;
    minute = Number(time[2] || 0);
    timeHint = time[0].replace(/\s+/g, "");
  } else if (/\bmorning\b/.test(lower)) {
    hour = 9;
    timeHint = "morning";
  } else if (/\b(afternoon|evening)\b/.test(lower)) {
    hour = lower.includes("evening") ? 18 : 15;
    timeHint = lower.includes("evening") ? "evening" : "afternoon";
  }

  if (!day && !time && !timeHint) {
    return { dueHint: "Soon" };
  }

  if (!day) day = new Date(anchor);
  day.setHours(hour, minute, 0, 0);

  const dueHint = [dayHint, timeHint].filter(Boolean).join(" ") || "Soon";
  return { dueAt: day.toISOString(), dueHint };
}

function findAssignee(raw: string, members: Member[], authorId: string): Member | null {
  const lower = raw.toLowerCase();
  const others = members.filter((m) => m.id !== authorId);

  for (const m of others) {
    const first = m.name.split(" ")[0]?.toLowerCase();
    if (first && first.length >= 2 && lower.includes(first)) return m;
  }

  // Self-assignment: "I'll …" / "I will …"
  if (/\b(i'?ll|i will|im going to|i'm going to)\b/i.test(raw)) {
    return members.find((m) => m.id === authorId) ?? null;
  }

  // "can you …" without a name → first other member (typical DM/group ask)
  if (/\bcan you\b/i.test(raw) || /\bcould you\b/i.test(raw)) {
    return others[0] ?? null;
  }

  return null;
}

function reminderText(raw: string, assignee: Member): string {
  let text = raw.trim();
  text = text.replace(/^reminder:\s*/i, "");
  text = text.replace(/^(hey|hi|hello)\s+[^,]+,\s*/i, "");
  text = text.replace(/\b(mijo|mija|honey|love),\s*/i, "");
  text = text.replace(/\bcan you\b/i, "").replace(/\bcould you\b/i, "");
  text = text.replace(/\bplease\b/i, "");
  text = text.replace(/\s+/g, " ").replace(/^[\s,.-]+|[\s.!?]+$/g, "").trim();

  if (text.length < 4) {
    return `Reminder for ${assignee.name.split(" ")[0]}`;
  }
  // Capitalize first letter
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Lightweight chat → reminder suggestion (no external AI). */
export function suggestReminderFromText(
  text: string,
  members: Member[],
  authorId: string,
  anchor: Date = new Date(),
): ReminderSuggestion | null {
  const raw = text.trim();
  if (raw.length < 8) return null;
  if (!REMINDER_CUE.test(raw)) return null;

  // Prefer scheduling over reminders when both fire (caller often checks schedule first)
  const looksLikeSharedEvent =
    /\b(family\s+call|facetime|video\s+call|zoom|dinner|lunch|brunch|party|tournament|game)\b/i.test(
      raw,
    ) && !/\b(reminder:|remind|can you|pick up|bring|drive|tell)\b/i.test(raw);
  if (looksLikeSharedEvent) return null;

  const assignee = findAssignee(raw, members, authorId);
  if (!assignee) return null;

  const { dueAt, dueHint } = parseDue(raw, anchor);
  return {
    assigneeId: assignee.id,
    text: reminderText(raw, assignee),
    dueAt,
    dueHint,
    sourceText: raw,
  };
}
