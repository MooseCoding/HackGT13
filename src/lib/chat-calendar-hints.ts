import { formatWhen } from "./clock";
import type { CalendarEvent } from "./types";

const STOP = new Set(
  "a an and at by for from has have her his in is of on our the this to with you your are we they that was were just like about".split(
    " ",
  ),
);

const GENERIC = new Set([
  "park",
  "place",
  "home",
  "house",
  "street",
  "south",
  "north",
  "east",
  "west",
  "come",
  "come by",
]);

const TIME_OF_DAY: Record<string, [number, number]> = {
  morning: [5, 11],
  breakfast: [6, 10],
  brunch: [9, 13],
  noon: [11, 13],
  lunch: [11, 14],
  afternoon: [12, 17],
  evening: [16, 21],
  dinner: [17, 21],
  night: [19, 24],
  tonight: [17, 24],
};

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Extra tokens that should light up an event if they show up in chat. */
const SYNONYMS: Record<string, string[]> = {
  dinner: ["dinner", "supper"],
  lunch: ["lunch"],
  breakfast: ["breakfast"],
  brunch: ["brunch", "breakfast", "lunch"],
  soccer: ["soccer", "football", "game", "match", "tournament", "practice", "field", "varsity", "score", "jersey", "coach"],
  tournament: ["tournament", "game", "match", "soccer"],
  game: ["game", "soccer", "match", "tournament", "varsity"],
  garden: ["garden", "tomato", "tomatoes", "harvest", "pickup", "fence", "basil", "mint", "chair"],
  tomato: ["tomato", "tomatoes", "garden", "harvest", "fence"],
  tomatoes: ["tomato", "tomatoes", "garden", "harvest", "fence"],
  pickup: ["pickup", "pick", "drive", "ride"],
  digest: ["digest", "weekly", "recap", "story"],
  appointment: ["appointment", "doctor", "dentist", "checkup", "clinic"],
  doctor: ["doctor", "appointment", "clinic", "checkup"],
  birthday: ["birthday", "party", "cake"],
  party: ["party", "birthday", "bbq", "cookout"],
  school: ["school", "class", "dropoff", "exam"],
  flight: ["flight", "airport", "trip", "vacation"],
  call: ["call", "facetime", "zoom", "video", "catch", "check-in", "checkin"],
  family: ["family", "circle", "everyone", "together"],
  piedmont: ["piedmont", "park", "field"],
};

const GENERIC_MEAL = new Set(["dinner", "lunch", "breakfast", "brunch", "meal", "supper", "food"]);

const DAY_RE = /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
const TIME_RE = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
const PROPOSAL_RE =
  /\b(how about|what about|can we|want to|shall we|let's|lets|go to|let's go|lets go|family dinner|family lunch)\b/i;

const FOLLOW_UP =
  /^(when|where|what time|which day|is it still|are we still|still on|remind me|don't forget|dont forget)/i;

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w) && !GENERIC.has(w));
}

function stem(token: string) {
  return token.replace(/'(s)?$/, "").replace(/s$/, "");
}

function possessiveNames(title: string) {
  return new Set([...(title.match(/\b[A-Za-z]+(?='s\b)/g) ?? [])].map((n) => n.toLowerCase()));
}

function weekdayToken(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
}

function expand(token: string) {
  const s = stem(token);
  return [...new Set([token, s, ...(SYNONYMS[token] ?? []), ...(SYNONYMS[s] ?? [])])];
}

function parseExplicitTime(text: string) {
  const m = text.match(TIME_RE);
  if (!m) return null;
  let hour = Number(m[1]) % 12;
  if (m[3].toLowerCase() === "pm") hour += 12;
  return { hour, minute: Number(m[2] || 0) };
}

function mentionedLocation(text: string) {
  const matches = [...text.matchAll(/\bat\s+([^?.!,]+)/gi)];
  for (let i = matches.length - 1; i >= 0; i--) {
    const chunk = matches[i][1].trim();
    if (TIME_RE.test(chunk) || /^\d/.test(chunk)) continue;
    if (chunk.length >= 3) return chunk.toLowerCase();
  }
  return null;
}

function locationMatchesMessage(msgLoc: string, event: CalendarEvent) {
  const hay = [event.location, event.title, event.sourceText]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!hay.trim()) return false;
  const parts = msgLoc.split(/\s+/).filter((w) => w.length > 2);
  return parts.some((p) => hay.includes(p)) || hay.includes(msgLoc) || msgLoc.includes(hay.slice(0, 24));
}

/** Don't link chat to existing events when the message is proposing a new one. */
export function shouldSuppressCalendarHints(text: string) {
  if (!text.trim()) return false;
  const hasDay = DAY_RE.test(text);
  const hasTime = TIME_RE.test(text);
  const hasPlace = /\bat\s+[A-Za-z]/i.test(text);
  const isProposal =
    PROPOSAL_RE.test(text) || /\?\s*$/.test(text) || /\b(reschedule|move it to|instead)\b/i.test(text);
  return isProposal && hasDay && (hasTime || hasPlace);
}

function scheduleConflictsWithEvent(text: string, event: CalendarEvent) {
  const msgPhrases = phrases(text);
  const msgWeekdays = msgPhrases.filter((p) => WEEKDAYS.includes(p));
  const eventWeekday = weekdayToken(event.startsAt);

  if (msgWeekdays.length > 0 && !msgWeekdays.includes(eventWeekday)) {
    return true;
  }

  const explicit = parseExplicitTime(text);
  if (explicit) {
    const eventDate = new Date(event.startsAt);
    const eventMinutes = eventDate.getHours() * 60 + eventDate.getMinutes();
    const msgMinutes = explicit.hour * 60 + explicit.minute;
    if (Math.abs(eventMinutes - msgMinutes) > 75) return true;
  }

  const msgLoc = mentionedLocation(text);
  if (msgLoc && event.location && !locationMatchesMessage(msgLoc, event)) {
    return true;
  }

  return false;
}

function phrases(text: string) {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const day of WEEKDAYS) {
    if (new RegExp(`\\b${day}\\b`).test(lower)) found.push(day);
  }
  if (/\bthis weekend\b/.test(lower)) found.push("saturday", "sunday");
  if (/\btomorrow\b/.test(lower)) found.push("tomorrow");
  if (/\btoday\b/.test(lower)) found.push("today");
  for (const label of Object.keys(TIME_OF_DAY)) {
    if (new RegExp(`\\b${label}\\b`).test(lower)) found.push(label);
  }
  return found;
}

function eventKeywordSet(event: CalendarEvent) {
  const bag = new Set<string>();
  const skip = possessiveNames(event.title);
  const raw = [event.title, event.location, event.sourceText].filter(Boolean).join(" ");
  for (const token of tokenize(raw)) {
    if (skip.has(token)) continue;
    for (const extra of expand(token)) bag.add(extra);
  }
  bag.add(weekdayToken(event.startsAt));
  return bag;
}

export type CalendarChatHint = {
  event: CalendarEvent;
  when: string;
  label: string;
  score: number;
  clues: string[];
};

export function scoreEventAgainstText(
  event: CalendarEvent,
  text: string,
  extraContext = "",
): { score: number; clues: string[] } {
  if (!text.trim() && !extraContext.trim()) return { score: 0, clues: [] };
  if (shouldSuppressCalendarHints(text)) return { score: 0, clues: [] };
  if (scheduleConflictsWithEvent(text, event)) return { score: 0, clues: [] };

  const followUp = FOLLOW_UP.test(text.trim()) || tokenize(text).length <= 2;
  const msgTokens = new Set(tokenize(text).flatMap((t) => expand(t)));
  const ctxTokens = new Set(tokenize(extraContext).flatMap((t) => expand(t)));
  const msgPhrases = phrases(text);
  const ctxPhrases = phrases(extraContext);
  const keys = eventKeywordSet(event);
  const weekday = weekdayToken(event.startsAt);
  const hour = new Date(event.startsAt).getHours();
  const eventDay = localDay(event.startsAt);

  const clues: string[] = [];
  let content = 0;
  let support = 0;

  for (const key of keys) {
    if (GENERIC.has(key) || STOP.has(key)) continue;
    if (msgTokens.has(key)) {
      content += key.length > 5 ? 3 : 2;
      clues.push(key);
    } else if (followUp && ctxTokens.has(key)) {
      content += 2;
      clues.push(key);
    } else if (ctxTokens.has(key)) {
      support += 1;
    }
  }

  const days = new Set([...msgPhrases, ...(followUp ? ctxPhrases : [])].filter((p) => WEEKDAYS.includes(p)));
  if (days.has(weekday)) {
    support += 2;
    clues.push(weekday);
  }
  if (msgPhrases.includes("today") && isSameLocalDay(event.startsAt, new Date())) {
    support += 2;
    clues.push("today");
  }
  if (msgPhrases.includes("tomorrow") && isSameLocalDay(event.startsAt, addDays(new Date(), 1))) {
    support += 2;
    clues.push("tomorrow");
  }
  if (msgPhrases.includes("saturday") || msgPhrases.includes("sunday")) {
    if (eventDay === 0 || eventDay === 6) support += 1;
  }

  for (const [label, [lo, hi]] of Object.entries(TIME_OF_DAY)) {
    if ((msgPhrases.includes(label) || (followUp && ctxPhrases.includes(label))) && hour >= lo && hour < hi) {
      support += 1;
      clues.push(label);
    }
  }

  const uniqueClues = [...new Set(clues)].slice(0, 4);
  const matchedGenericMeal = uniqueClues.some((c) => GENERIC_MEAL.has(c));
  const matchedSpecific = uniqueClues.some((c) => !GENERIC_MEAL.has(c) && !WEEKDAYS.includes(c));

  if (content === 0 && support < 3) return { score: 0, clues: [] };
  if (content === 0 && !days.size && support < 4) return { score: 0, clues: [] };
  if (matchedGenericMeal && !matchedSpecific && !days.has(weekday) && !followUp) {
    return { score: 0, clues: [] };
  }
  return { score: content * 2 + support, clues: uniqueClues };
}

function localDay(iso: string) {
  return new Date(iso).getDay();
}

function isSameLocalDay(iso: string, d: Date) {
  const a = new Date(iso);
  return a.getFullYear() === d.getFullYear() && a.getMonth() === d.getMonth() && a.getDate() === d.getDate();
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function calendarHintsForText(
  text: string,
  events: CalendarEvent[],
  extraContext = "",
): CalendarChatHint[] {
  if (!text.trim() && !extraContext.trim()) return [];
  const hits: CalendarChatHint[] = [];
  for (const event of events) {
    const { score, clues } = scoreEventAgainstText(event, text, extraContext);
    if (score > 0) {
      hits.push({
        event,
        when: formatWhen(event.startsAt),
        label: event.title,
        score,
        clues,
      });
    }
  }
  return hits.sort((a, b) => b.score - a.score || a.event.startsAt.localeCompare(b.event.startsAt)).slice(0, 4);
}

export function searchEventsByClues(query: string, events: CalendarEvent[]): CalendarEvent[] {
  if (!query.trim()) return events;
  const ranked = events
    .map((event) => ({ event, ...scoreEventAgainstText(event, query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.event.startsAt.localeCompare(b.event.startsAt));
  return ranked.map((r) => r.event);
}
