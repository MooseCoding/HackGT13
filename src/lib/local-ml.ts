/** Local, dependency-free text models — keyword scoring + Markov chains. */

import type { Member, Post } from "./types";

// ── shared token helpers ──────────────────────────────────────────────

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

const STOP = new Set(
  "the a an and or but in on at to for of is was are be been being have has had do does did will would could should may might must shall can i you he she it we they my your his her our their this that these those with from by about into through during before after above below between".split(
    " ",
  ),
);

function contentTokens(text: string) {
  return tokenize(text).filter((w) => !STOP.has(w) && w.length > 2);
}

// ── topic buckets (keyword → theme) ───────────────────────────────────

const TOPICS: Record<string, string[]> = {
  gathering: ["dinner", "lunch", "breakfast", "brunch", "cook", "cooking", "recipe", "kitchen", "table", "meal", "ate", "food", "tacos", "cake"],
  outdoors: ["park", "walk", "walking", "garden", "yard", "porch", "sun", "outside", "soccer", "game", "playground"],
  care: ["doctor", "appointment", "medicine", "pill", "hospital", "checkup", "therapy", "nurse", "clinic"],
  memory: ["remember", "remembered", "forgot", "forgotten", "memory", "years", "ago", "story", "stories", "childhood", "photo", "album"],
  celebration: ["birthday", "party", "celebrate", "anniversary", "graduation", "wedding", "holiday", "christmas", "thanksgiving"],
  connection: ["miss", "love", "loved", "hug", "call", "called", "visit", "visited", "together", "family", "home", "hearth"],
};

export type TopicScore = { topic: string; score: number; hits: string[] };

export function scoreTopics(texts: string[]): TopicScore[] {
  const blob = texts.join(" ").toLowerCase();
  const tokens = new Set(contentTokens(blob));
  const scores: TopicScore[] = [];
  for (const [topic, keywords] of Object.entries(TOPICS)) {
    const hits = keywords.filter((k) => blob.includes(k) || tokens.has(k));
    if (hits.length) scores.push({ topic, score: hits.length, hits });
  }
  return scores.sort((a, b) => b.score - a.score);
}

export function dominantTopic(texts: string[]): TopicScore | null {
  return scoreTopics(texts)[0] ?? null;
}

// ── Markov chain (order-2) ────────────────────────────────────────────

type Chain = Map<string, string[]>;

function buildChain(sentences: string[]): Chain {
  const chain: Chain = new Map();
  for (const raw of sentences) {
    const words = tokenize(raw).filter((w) => !STOP.has(w));
    for (let i = 0; i < words.length - 2; i++) {
      const key = `${words[i]} ${words[i + 1]}`;
      const next = words[i + 2];
      const list = chain.get(key) ?? [];
      list.push(next);
      chain.set(key, list);
    }
  }
  return chain;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function markovSentence(chain: Chain, seed: string[], maxLen = 14): string {
  if (!chain.size) return "";
  const keys = [...chain.keys()];
  let key = keys.find((k) => seed.some((s) => k.startsWith(s))) ?? pick(keys);
  const parts = key.split(" ");
  for (let i = 0; i < maxLen; i++) {
    const opts = chain.get(key);
    if (!opts?.length) break;
    const next = pick(opts);
    parts.push(next);
    key = `${parts[parts.length - 2]} ${parts[parts.length - 1]}`;
  }
  const s = parts.join(" ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const OPENERS: Record<string, string[]> = {
  gathering: ["Around the table", "Over dinner", "In the kitchen"],
  outdoors: ["Out on the porch", "Outside", "On a walk"],
  care: ["Health came up", "Appointments were on the calendar"],
  memory: ["Old stories came up", "A photo sent everyone back"],
  celebration: ["A good week for wins", "Something to mark"],
  connection: ["People checked in", "Calls and notes kept coming"],
  default: ["This week", "On the porch", "In the circle"],
};

const CLOSERS: Record<string, string[]> = {
  gathering: ["Everyone left with full plates."],
  outdoors: ["Fresh air and familiar faces."],
  care: ["Small steps, steady support."],
  memory: ["The past felt close this week."],
  celebration: ["Worth a toast."],
  connection: ["The circle stayed in touch."],
  default: ["Another week together."],
};

export function generateStory(
  posts: Post[],
  members: Member[],
  memberName: (id: string) => string,
): { title: string; narrative: string; theme: string } {
  const texts = posts.map((p) => p.transcript || p.body).filter(Boolean);
  const topic = dominantTopic(texts);
  const theme = topic?.topic ?? "connection";

  const sentences = texts
    .flatMap((t) => t.split(/[.!?]+/))
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 4);
  const chain = buildChain(sentences);

  const seedWords = topic?.hits.slice(0, 2) ?? ["family"];
  const generated = markovSentence(chain, seedWords);
  const opener = pick(OPENERS[theme] ?? OPENERS.default);
  const closer = pick(CLOSERS[theme] ?? CLOSERS.default);

  const people = [...new Set(posts.map((p) => memberName(p.authorId)))];
  const who =
    people.length === 1
      ? people[0]
      : people.length === 2
        ? `${people[0]} and ${people[1]}`
        : people.length > 2
          ? `${people.slice(0, -1).join(", ")}, and ${people[people.length - 1]}`
          : "";

  const title =
    topic && topic.hits[0]
      ? topic.hits[0].charAt(0).toUpperCase() + topic.hits[0].slice(1)
      : generated.split(" ").slice(0, 4).join(" ") || "This week";

  const narrativeParts = who
    ? [`${opener}, ${who} checked in.`]
    : [`${opener} — not much landed in chat this week.`];
  if (generated) narrativeParts.push(generated + ".");
  if (topic?.hits.length) {
    narrativeParts.push(`Most of the week was about ${topic.hits.slice(0, 3).join(", ")}.`);
  }
  narrativeParts.push(closer);

  return { title, narrative: narrativeParts.join(" "), theme };
}

// ── week highlights (keyword-scored moments for digest) ───────────────

const HIGHLIGHT_PATTERNS: { keywords: string[]; weight: number }[] = [
  { keywords: ["win", "won", "wins", "winning", "victory"], weight: 3 },
  { keywords: ["proud", "amazing", "wonderful", "fantastic", "awesome", "incredible"], weight: 2 },
  { keywords: ["great job", "well done", "nailed it", "so good"], weight: 2 },
  { keywords: ["celebrate", "celebration", "celebrated", "milestone"], weight: 2 },
  { keywords: ["love", "loved", "grateful", "thankful", "blessed"], weight: 2 },
  { keywords: ["happy", "excited", "thrilled", "joy", "smile", "smiled"], weight: 1 },
  { keywords: ["first time", "finally", "achieved", "success", "succeeded"], weight: 2 },
  { keywords: ["best", "breakthrough", "accomplished"], weight: 1 },
];

function matchesHighlightKeyword(text: string, keyword: string): boolean {
  const lower = text.toLowerCase();
  if (keyword.includes(" ")) return lower.includes(keyword);
  const tokens = tokenize(lower);
  return tokens.some((t) => t === keyword || (keyword.length >= 5 && t.startsWith(keyword)));
}

function scoreHighlightText(text: string): number {
  let score = 0;
  for (const { keywords, weight } of HIGHLIGHT_PATTERNS) {
    for (const keyword of keywords) {
      if (matchesHighlightKeyword(text, keyword)) score += weight;
    }
  }
  return score;
}

/** Pick up to `limit` keyword-matched moments from the week's posts (no API). */
export function pickWeekHighlights(
  posts: Post[],
  memberName: (id: string) => string,
  limit = 5,
): string[] {
  const scored = posts.map((p) => {
    const text = p.transcript || p.body;
    const bit = text.slice(0, 110);
    return {
      score: scoreHighlightText(text),
      createdAt: p.createdAt,
      line: `${memberName(p.authorId)}: ${bit}${bit.length >= 110 ? "…" : ""}`,
    };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map((s) => s.line);
}

// ── context clues (keyword relevance for HCP evidence) ──────────────

const CLUE_PATTERNS: { tag: string; keywords: string[]; weight: number }[] = [
  { tag: "late-night", keywords: ["can't sleep", "awake", "insomnia", "2am", "3am", "midnight", "late", "nightmare"], weight: 3 },
  { tag: "confusion", keywords: ["forgot", "forgotten", "lost", "confused", "where", "can't find", "misplaced", "train of thought"], weight: 3 },
  { tag: "bipolar", keywords: ["bipolar", "manic episode", "hypomanic", "mood swing", "mood cycling", "depressive episode"], weight: 4 },
  { tag: "depression", keywords: ["depression", "depressive disorder", "clinical depression", "depressive episode", "depressive spiral"], weight: 4 },
  { tag: "ptsd", keywords: ["ptsd", "post-traumatic", "posttraumatic", "trauma is back"], weight: 4 },
  { tag: "ocd", keywords: ["ocd", "obsessive-compulsive", "intrusive thoughts", "can't stop checking", "compulsion"], weight: 4 },
  { tag: "adhd", keywords: ["adhd", "attention deficit", "can't focus", "scatterbrained", "hyperactive"], weight: 3 },
  { tag: "schizophrenia", keywords: ["schizophrenia", "psychotic episode", "psychosis"], weight: 4 },
  { tag: "low-mood", keywords: ["hopeless", "worthless", "empty", "numb", "depressed", "crying", "no energy", "don't care"], weight: 3 },
  { tag: "anxiety", keywords: ["anxious", "panic", "racing thoughts", "on edge", "dread", "can't breathe", "heart pounding"], weight: 3 },
  { tag: "psychosis", keywords: ["hearing voices", "not real", "watching me", "paranoia", "out to get"], weight: 4 },
  { tag: "mania", keywords: ["haven't slept", "unstoppable", "spending spree", "invincible", "talking too fast"], weight: 3 },
  { tag: "trauma", keywords: ["flashback", "triggered", "reliving", "panic attack", "startled"], weight: 3 },
  { tag: "substance", keywords: ["drinking again", "relapse", "need a drink", "using again", "pills again"], weight: 3 },
  { tag: "eating", keywords: ["not eating", "binge", "throwing up", "hate my body", "fasting"], weight: 3 },
  { tag: "loneliness", keywords: ["lonely", "alone", "miss", "wish", "nobody", "quiet house", "no one cares"], weight: 2 },
  { tag: "worry", keywords: ["worried", "scared", "afraid", "nervous", "stress", "overwhelmed"], weight: 2 },
  { tag: "repetition", keywords: ["again", "already said", "told you", "like i said", "keep forgetting"], weight: 2 },
  { tag: "withdrawal", keywords: ["don't want", "leave me", "not today", "cancel", "skip", "stay in bed"], weight: 2 },
  { tag: "positive", keywords: ["love", "happy", "glad", "wonderful", "grateful", "thankful", "proud"], weight: -1 },
];

export type ContextClue = { postId: string; score: number; tags: string[]; snippet: string };

export function rankContextClues(posts: Post[], limit = 5): ContextClue[] {
  const ranked = posts.map((p) => {
    const text = (p.transcript || p.body).toLowerCase();
    const tags: string[] = [];
    let score = 0;
    for (const pat of CLUE_PATTERNS) {
      const matched = pat.keywords.filter((k) => text.includes(k));
      if (matched.length) {
        tags.push(pat.tag);
        score += pat.weight * matched.length;
      }
    }
    const hour = new Date(p.createdAt).getHours();
    if (hour >= 22 || hour < 5) {
      tags.push("late-night");
      score += 2;
    }
    return {
      postId: p.id,
      score,
      tags: [...new Set(tags)],
      snippet: (p.transcript || p.body).slice(0, 120),
    };
  });
  return ranked
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ── calendar entity extraction ────────────────────────────────────────

const EVENT_TYPES: Record<string, string[]> = {
  appointment: ["doctor", "dentist", "checkup", "appointment", "therapy", "clinic", "vaccine"],
  sports: ["soccer", "game", "practice", "tournament", "match", "recital", "concert"],
  social: ["dinner", "party", "birthday", "bbq", "cookout", "visit", "lunch", "brunch"],
  school: ["school", "class", "pickup", "dropoff", "parent night", "conference", "exam"],
  travel: ["flight", "airport", "trip", "drive", "road trip", "vacation"],
};

const DURATION_HINTS: { pattern: RegExp; hours: number }[] = [
  { pattern: /\ball day\b/i, hours: 8 },
  { pattern: /\bhalf day\b/i, hours: 4 },
  { pattern: /\b(\d+)\s*hours?\b/i, hours: 0 },
  { pattern: /\b(\d+)\s*hr\b/i, hours: 0 },
];

const RECURRENCE = [
  { pattern: /\bevery\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, weekly: true },
  { pattern: /\bweekly\b/i, weekly: true },
];

export type CalendarParseHint = {
  eventType: string | null;
  durationHours: number;
  recurring: boolean;
  confidence: number;
  suggestions: string[];
};

export function analyzeCalendarText(raw: string): CalendarParseHint {
  const lower = raw.toLowerCase();
  let eventType: string | null = null;
  let confidence = 0;
  for (const [type, keywords] of Object.entries(EVENT_TYPES)) {
    const hits = keywords.filter((k) => lower.includes(k));
    if (hits.length > confidence) {
      eventType = type;
      confidence = hits.length;
    }
  }

  let durationHours = 1;
  for (const hint of DURATION_HINTS) {
    const m = lower.match(hint.pattern);
    if (m) {
      durationHours = hint.hours || Number(m[1]) || 1;
      break;
    }
  }

  const recurring = RECURRENCE.some((r) => r.pattern.test(lower));

  const suggestions: string[] = [];
  if (!/\b(am|pm|\d{1,2}:\d{2})\b/i.test(raw)) suggestions.push("Add a time (e.g. 3 PM)");
  if (!/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)\b/i.test(lower))
    suggestions.push("Add a day");
  if (eventType === "sports" && !/\bat\s+\S/i.test(raw)) suggestions.push("Add a location with “at …”");

  return { eventType, durationHours, recurring, confidence, suggestions };
}

const TITLE_SMALL = new Set(["a", "an", "the", "at", "in", "on", "to", "for", "and", "or", "of", "with"]);

/** Title-case event names: "dinner at burger king" → "Dinner at Burger King". */
export function capitalizeEventTitle(title: string) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .map((word, i) => {
      if (i > 0 && TITLE_SMALL.has(word.toLowerCase())) return word.toLowerCase();
      const parts = word.split(/(['-])/);
      return parts
        .map((part, j) => {
          if (part === "'" || part === "-") return part;
          if (j > 0 && part.length <= 2) return part.toLowerCase();
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join("");
    })
    .join(" ");
}

export function cleanEventTitle(raw: string, hint: CalendarParseHint): string {
  let title = raw.replace(/\b(this|next|every|on)\s+/gi, "").trim();
  if (!title && hint.eventType) {
    const labels: Record<string, string> = {
      appointment: "Doctor appointment",
      sports: "Game / practice",
      social: "Family gathering",
      school: "School event",
      travel: "Trip",
    };
    title = labels[hint.eventType] ?? "Event";
  }
  if (title.length > 72) title = title.slice(0, 69) + "…";
  title = title || raw.trim().slice(0, 72);
  return capitalizeEventTitle(title);
}
