import { formatWhen } from "./clock";
import { analyzeCalendarText, capitalizeEventTitle, cleanEventTitle } from "./local-ml";
import { isWeeklyFamilyCall, proposeWeeklyFamilyCalls } from "./family-call-schedule";
import type { CalendarEvent, Member, Post } from "./types";

export type ScheduleSuggestion = {
  title: string;
  startsAtHint: string;
  reason: string;
  suggestedText: string;
  /** Original chat message - best source of context for calendar parsing. */
  sourceText: string;
  weeklyFamilyCall?: boolean;
};

const WEEKLY_CALL_RE =
  /\b(weekly\s+(family\s+)?call|family\s+call|sunday\s+call|facetime|video\s+call|zoom(?:\s+call)?)\b/i;
/** Broad cues that a message might be scheduling something. */
const SCHEDULE_CUE_RE =
  /\b(family\s+call|facetime|video\s+call|zoom|catch\s+up|check[\s-]?in|sunday\s+dinner|lunch|dinner|breakfast|brunch|call|soccer|game|tournament|practice|appointment|doctor|dentist|party|birthday|pickup|visit|bbq|cookout|flight|trip)\b/i;
/** Only true call/video chat - not dinner, lunch, etc. */
const CALL_ONLY_RE = /\b(family\s+call|facetime|video\s+call|zoom(?:\s+call)?|catch\s+up|check[\s-]?in)\b/i;
const TIME_RE = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
const DAY_RE = /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
const PROPOSAL_RE = /\b(how about|what about|can we|want to|shall we|let's|lets|go to|let's go|lets go|family dinner|family lunch)\b/i;
const PROPOSAL_PREFIX =
  /^(how about|what about|can we|want to|shall we|let's|lets|maybe|should we|reminder:?)\s+/i;

function memberFirstName(raw: string, members: Member[]) {
  const lower = raw.toLowerCase();
  return (
    members.find((m) => lower.includes(m.name.split(" ")[0].toLowerCase()))?.name.split(" ")[0] ?? "family"
  );
}

function venueFromText(raw: string) {
  const matches = [...raw.matchAll(/\bat\s+([^?.!,]+)/gi)];
  for (let i = matches.length - 1; i >= 0; i--) {
    const chunk = matches[i][1].trim();
    if (TIME_RE.test(chunk) || /^\d/.test(chunk)) continue;
    if (chunk.length >= 3) return chunk;
  }
  return null;
}

/** Pull a human title from the message using event type, keywords, and stripped time/day noise. */
export function extractScheduleTitle(raw: string, members: Member[]): string {
  const hint = analyzeCalendarText(raw);
  const lower = raw.toLowerCase();

  if (CALL_ONLY_RE.test(raw) && !/\b(dinner|lunch|breakfast|brunch|soccer|game|tournament|appointment|doctor|dentist|party|birthday)\b/i.test(lower)) {
    return `Family call with ${memberFirstName(raw, members)}`;
  }

  const meal = raw.match(/\b(dinner|lunch|breakfast|brunch)\b/i)?.[1];
  const venue = venueFromText(raw);
  if (meal && venue) {
    return cleanEventTitle(`${meal} at ${venue}`, hint);
  }

  let snippet = raw.trim().replace(PROPOSAL_PREFIX, "").replace(/\?\s*$/, "").trim();
  snippet = snippet.replace(/\bgo to\s+/i, "");
  snippet = snippet
    .replace(TIME_RE, "")
    .replace(DAY_RE, "")
    .replace(/\b(this|next|every)\s+/gi, "")
    .replace(/\b(on|at|by|around|about)\s*$/gi, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s,.-]+|[\s,.-]+$/g, "")
    .trim();

  if (snippet.length >= 4) {
    return cleanEventTitle(snippet, hint);
  }

  if (/\bsoccer\b/i.test(raw) && /\btournament\b/i.test(raw)) return capitalizeEventTitle("Soccer tournament");
  if (/\bsoccer\b/i.test(raw) || (hint.eventType === "sports" && /\bgame\b/i.test(raw))) {
    const who = memberFirstName(raw, members);
    return capitalizeEventTitle(who !== "family" ? `${who}'s soccer game` : "Soccer game");
  }
  if (/\bdinner\b/i.test(raw)) return capitalizeEventTitle(/\bfamily\b/i.test(raw) ? "Family dinner" : "Dinner");
  if (/\blunch\b/i.test(raw)) return capitalizeEventTitle(/\bfamily\b/i.test(raw) ? "Family lunch" : "Lunch");
  if (/\bbrunch\b/i.test(raw)) return capitalizeEventTitle("Family brunch");
  if (/\bbirthday\b/i.test(raw)) return capitalizeEventTitle("Birthday party");
  if (/\bappointment\b/i.test(raw) || /\bdoctor\b/i.test(raw)) return capitalizeEventTitle("Doctor appointment");
  if (/\bvisit\b/i.test(raw)) return capitalizeEventTitle("Family visit");
  if (hint.eventType === "school") return capitalizeEventTitle("School event");
  if (hint.eventType === "travel") return capitalizeEventTitle("Trip");

  const chunk = raw.split(/[.!?,]/)[0]?.trim() ?? raw;
  return cleanEventTitle(chunk.slice(0, 72), hint);
}

/** Cheap first pass - skip calendar parsing unless the text looks like scheduling. */
export function looksLikeScheduleText(text: string) {
  const raw = text.trim();
  if (raw.length < 8) return false;
  return (
    WEEKLY_CALL_RE.test(raw) ||
    SCHEDULE_CUE_RE.test(raw) ||
    (DAY_RE.test(raw) && TIME_RE.test(raw)) ||
    (PROPOSAL_RE.test(raw) && DAY_RE.test(raw))
  );
}

/** Lightweight text → calendar suggestion (no external AI). */
export function suggestScheduleFromText(
  text: string,
  members: Member[],
  events: CalendarEvent[] = [],
  opts?: { familyId?: string; createdBy?: string; anchor?: Date },
): ScheduleSuggestion | null {
  const raw = text.trim();
  if (!looksLikeScheduleText(raw)) return null;

  const mentionsCall = WEEKLY_CALL_RE.test(raw);
  const proposed =
    mentionsCall && opts?.familyId && opts.createdBy
      ? proposeWeeklyFamilyCalls(events, {
          familyId: opts.familyId,
          createdBy: opts.createdBy,
          members,
          anchor: opts.anchor ?? new Date(),
        })
      : [];
  const explicitWeekly = /\b(every|weekly|each week|sundays?|regularly|again|reschedule|set up)\b/i.test(raw);
  const wantsWeekly =
    mentionsCall &&
    proposed.length > 0 &&
    (explicitWeekly || !events.some(isWeeklyFamilyCall));

  if (wantsWeekly && opts?.familyId && opts.createdBy) {
    const first = proposed[0];
    const rescheduling = events.some(isWeeklyFamilyCall);
    return {
      title: "Weekly family call",
      startsAtHint: formatWhen(first.startsAt),
      reason: rescheduling
        ? "A few weeks still need a call. Here are open times."
        : "We found open times that fit everyone's calendars.",
      suggestedText: `${first.title} ${formatWhen(first.startsAt)}`,
      sourceText: raw,
      weeklyFamilyCall: true,
    };
  }

  const hasScheduleCue =
    SCHEDULE_CUE_RE.test(raw) ||
    (DAY_RE.test(raw) && TIME_RE.test(raw)) ||
    (PROPOSAL_RE.test(raw) && DAY_RE.test(raw)) ||
    (/\?\s*$/.test(raw) && DAY_RE.test(raw) && TIME_RE.test(raw));

  if (!hasScheduleCue) return null;

  const day = raw.match(DAY_RE)?.[1] ?? "this weekend";
  const time = raw.match(TIME_RE)?.[0] ?? "6 PM";
  const title = extractScheduleTitle(raw, members);

  return {
    title,
    startsAtHint: `${day} ${time}`,
    reason: "This message mentions a time. Add it to the calendar?",
    suggestedText: `${title} ${day} at ${time}`,
    sourceText: raw,
  };
}

const CONFIRMATION_EXACT =
  /^(sure|yes|yeah|yep|yup|ok|okay|k|sounds good|works for me|works|let's do it|lets do it|count me in|i'm in|im in|perfect|great|definitely|absolutely|that works|good with me|sure thing|yes please|sounds great|that sounds good|let's go|lets go)([!.?]*)$/i;

/** Short affirmative replies that confirm a prior scheduling proposal. */
export function isScheduleConfirmation(text: string) {
  const trimmed = text.trim();
  if (trimmed.length > 48) return false;
  const normalized = trimmed.replace(/[.!?]+$/g, "").trim();
  if (CONFIRMATION_EXACT.test(normalized)) return true;
  return /^(👍|✅|🙌)$/.test(trimmed);
}

/** Find the most recent scheduling proposal in a thread that a confirmation can accept. */
export function findScheduleProposalForConfirmation(
  confirmationText: string,
  threadPosts: Post[],
  excludePostId: string,
  members: Member[],
  events: CalendarEvent[],
  opts?: { familyId?: string; anchor?: Date },
): ScheduleSuggestion | null {
  if (!isScheduleConfirmation(confirmationText)) return null;

  const prior = threadPosts
    .filter((p) => p.id !== excludePostId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20);

  for (const post of prior) {
    const text = post.transcript || post.body;
    const suggestion = suggestScheduleFromText(text, members, events, {
      familyId: opts?.familyId,
      createdBy: post.authorId,
      anchor: opts?.anchor,
    });
    if (suggestion) return suggestion;
  }
  return null;
}
