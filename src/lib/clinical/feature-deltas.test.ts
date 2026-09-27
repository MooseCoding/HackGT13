import { describe, expect, it } from "vitest";
import { analyzeMember } from "@/lib/analysis";
import { featureDeltasFromSnapshot, formatFeatureDelta } from "@/lib/clinical/feature-deltas";
import type { Post } from "@/lib/types";

function post(partial: Partial<Post> & Pick<Post, "id" | "createdAt" | "body">): Post {
  return {
    familyId: "okonkwo",
    authorId: "ruth",
    kind: "text",
    threadId: "group",
    ...partial,
  };
}

describe("feature deltas", () => {
  it("surfaces exact current vs baseline strings from flags", () => {
    const posts: Post[] = [
      post({ id: "b1", createdAt: "2026-08-20T14:00:00-04:00", body: "I walked through the garden and called my sister afterward." }),
      post({ id: "b2", createdAt: "2026-08-24T14:00:00-04:00", body: "We cooked dinner together and planned a picnic for Sunday." }),
      post({ id: "b3", createdAt: "2026-08-28T14:00:00-04:00", body: "The neighborhood meeting was lively and useful for everyone." }),
      post({ id: "b4", createdAt: "2026-09-01T14:00:00-04:00", body: "I finished my book and shared it with James this afternoon." }),
      post({
        id: "b-voice",
        createdAt: "2026-09-02T15:00:00-04:00",
        kind: "voice",
        body: "Voice note",
        transcript: "The garden club met by the library this morning.",
        audioMetrics: { durationSeconds: 18, wordsPerMinute: 130, pauseRatio: 0.1, averagePauseSeconds: 0.4, hesitationRate: 0.03 },
      }),
      post({ id: "r1", createdAt: "2026-09-18T23:30:00-04:00", body: "Hard day. I forgot again. The list the list." }),
      post({ id: "r2", createdAt: "2026-09-21T23:45:00-04:00", body: "Hard day. I forgot again. The list the list." }),
      post({ id: "r3", createdAt: "2026-09-24T23:15:00-04:00", body: "Hard day. I forgot again. The list the list." }),
      post({
        id: "r-voice",
        createdAt: "2026-09-25T01:10:00-04:00",
        kind: "voice",
        body: "WhatsApp voice note",
        transcript: "The list. The stew. I am feeling low today. I cannot find the list.",
        channel: "whatsapp",
        audioMetrics: { durationSeconds: 19, wordsPerMinute: 49, pauseRatio: 0.44, averagePauseSeconds: 1.8, hesitationRate: 0.18 },
      }),
    ];

    const snapshot = analyzeMember("ruth", posts, new Date("2026-09-26T12:00:00-04:00"));
    const deltas = featureDeltasFromSnapshot(snapshot);
    expect(deltas.length).toBeGreaterThan(0);
    expect(deltas.every((delta) => delta.current && delta.baseline)).toBe(true);

    const voice = deltas.find((delta) => delta.code === "voice_change");
    expect(voice).toBeTruthy();
    expect(voice?.summary.toLowerCase()).toMatch(/hesitation|pause|pace/);
    expect(voice?.evidenceIds).toContain("r-voice");
    expect(formatFeatureDelta(voice!)).toContain("vs");
  });
});
