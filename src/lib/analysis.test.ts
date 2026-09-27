import { describe, expect, it } from "vitest";
import { analyzeMember } from "./analysis";
import type { Post } from "./types";

const reference = new Date("2026-09-26T12:00:00-04:00");

function post(id: string, createdAt: string, body: string): Post {
  return { id, familyId: "test-family", authorId: "patient", kind: "text", body, createdAt };
}

describe("analyzeMember", () => {
  it("does not create a clinical flag from one isolated difficult message", () => {
    const snapshot = analyzeMember(
      "patient",
      [post("one", "2026-09-25T14:00:00-04:00", "I am not feeling well today")],
      reference,
    );
    expect(snapshot.riskLevel).toBe("stable");
    expect(snapshot.flags).toHaveLength(0);
    expect(snapshot.insight.status).toBe("insufficient_data");
  });

  it("escalates a sustained multi-signal change against a personal baseline", () => {
    const baseline = [
      post("b1", "2026-08-15T09:00:00-04:00", "I walked through the neighborhood garden and shared tea with several friends."),
      post("b2", "2026-08-20T10:00:00-04:00", "We planned a family dinner with music, fresh vegetables, and stories from school."),
      post("b3", "2026-08-25T08:30:00-04:00", "The library club discussed a wonderful novel before our long afternoon walk."),
      post("b4", "2026-09-01T11:00:00-04:00", "I prepared breakfast, called my sister, and organized the colorful photographs."),
    ];
    const current = [
      post("c1", "2026-09-18T23:20:00-04:00", "Where is the list."),
      post("c2", "2026-09-21T00:10:00-04:00", "Where is the list."),
      post("c3", "2026-09-24T01:15:00-04:00", "Where is the list."),
    ];
    const snapshot = analyzeMember("patient", [...baseline, ...current], reference);
    expect(snapshot.insight.status).toBe("ready");
    expect(snapshot.riskLevel).toBe("priority");
    expect(snapshot.flags.map((flag) => flag.code)).toContain("repetition_change");
    expect(snapshot.flags.length).toBeGreaterThanOrEqual(2);
  });
});
