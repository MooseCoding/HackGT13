import { CLINICAL_INTAKE_THREAD } from "../chat";
import { atDay } from "../clock";
import { detectCheckInSuggestion, scoreDisorderConfidence } from "./check-in";
import { rankContextClues } from "../local-ml";
import type { Post } from "../types";

export type DisorderSignalHit = {
  id: string;
  concern: string;
  label: string;
  /** 0–100 language-match strength — not diagnostic probability. */
  confidence: number;
  guidance: string;
  tags: string[];
  channel: string;
  receivedAt: string;
  /** Clinician-only preview — withheld from family chat. */
  clinicianPreview: string;
};

type DemoScriptItem = {
  id: string;
  body: string;
  transcript?: string;
  kind: Post["kind"];
  daysAgo: number;
  hour: number;
  minute: number;
  voiceSeconds?: number;
};

/** Deterministic consented intake messages for the HCP disorder-check demo. */
export const DISORDER_DEMO_SCRIPT: DemoScriptItem[] = [
  {
    id: "wa-disorder-elena-1",
    kind: "voice",
    body: "WhatsApp voice note",
    transcript: "My bipolar is acting up. I have not slept in three days.",
    daysAgo: 2,
    hour: 1,
    minute: 8,
    voiceSeconds: 19,
  },
  {
    id: "wa-disorder-elena-2",
    kind: "text",
    body: "My depression is worse this week. I do not want to see anyone.",
    daysAgo: 1,
    hour: 23,
    minute: 41,
  },
  {
    id: "wa-disorder-elena-3",
    kind: "text",
    body: "Had a flashback during dinner. My PTSD is acting up again.",
    daysAgo: 1,
    hour: 1,
    minute: 14,
  },
  {
    id: "wa-disorder-elena-4",
    kind: "text",
    body: "I cannot stop checking the locks because of my OCD.",
    daysAgo: 0,
    hour: 22,
    minute: 5,
  },
];

export function buildDisorderDemoPosts(memberId: string, familyId: string): Post[] {
  return DISORDER_DEMO_SCRIPT.map((item) => ({
    id: item.id,
    familyId,
    authorId: memberId,
    kind: item.kind,
    body: item.body,
    transcript: item.transcript,
    threadId: CLINICAL_INTAKE_THREAD,
    channel: "whatsapp" as const,
    rawRetained: false,
    externalMessageId: item.id,
    createdAt: atDay(item.daysAgo, item.hour, item.minute),
    ...(item.kind === "voice"
      ? {
          voiceSeconds: item.voiceSeconds ?? 18,
          audioMetrics: {
            durationSeconds: item.voiceSeconds ?? 18,
            wordsPerMinute: 52,
            pauseRatio: 0.41,
            averagePauseSeconds: 1.6,
            hesitationRate: 0.16,
          },
        }
      : {}),
  }));
}

export function scanDisorderSignals(posts: Post[]): DisorderSignalHit[] {
  const hits: DisorderSignalHit[] = [];
  for (const post of posts) {
    const text = post.transcript || post.body;
    const suggestion = detectCheckInSuggestion(text);
    if (!suggestion) continue;
    const clues = rankContextClues([post], 4);
    const contextScore = clues[0]?.score ?? 0;
    hits.push({
      id: post.id,
      concern: suggestion.concern,
      label: suggestion.label,
      confidence: scoreDisorderConfidence(text, suggestion.concern, contextScore),
      guidance: suggestion.message,
      tags: clues[0]?.tags.length ? clues[0].tags : [suggestion.concern],
      channel: post.channel ?? "whatsapp",
      receivedAt: post.createdAt,
      clinicianPreview: text.slice(0, 140),
    });
  }
  return hits.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}
