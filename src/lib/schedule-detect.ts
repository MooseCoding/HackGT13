import type { Member } from "./types";

export type ScheduleSuggestion = {
  title: string;
  startsAtHint: string;
  reason: string;
  suggestedText: string;
};

const CALL_RE =
  /\b(family\s+call|facetime|video\s+call|zoom|catch\s+up|check\s+in|sunday\s+dinner|lunch|dinner|call)\b/i;
const TIME_RE = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
const DAY_RE = /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;

/** Lightweight text → calendar suggestion (no external AI). */
export function suggestScheduleFromText(
  text: string,
  members: Member[],
): ScheduleSuggestion | null {
  const raw = text.trim();
  if (raw.length < 8) return null;
  if (!CALL_RE.test(raw) && !(DAY_RE.test(raw) && TIME_RE.test(raw))) return null;

  const day = raw.match(DAY_RE)?.[1] ?? "this weekend";
  const time = raw.match(TIME_RE)?.[0] ?? "6 PM";
  const who =
    members.find((m) => raw.toLowerCase().includes(m.name.split(" ")[0].toLowerCase()))?.name.split(
      " ",
    )[0] ?? "the family";

  const title = CALL_RE.test(raw)
    ? `Family call with ${who}`
    : raw.length > 48
      ? `${raw.slice(0, 45)}…`
      : raw;

  return {
    title,
    startsAtHint: `${day} ${time}`,
    reason: "Hearth noticed a time or call in the message.",
    suggestedText: `${title} ${day} at ${time}`,
  };
}
