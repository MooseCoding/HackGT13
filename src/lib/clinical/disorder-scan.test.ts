import { describe, expect, it } from "vitest";
import { CLINICAL_INTAKE_THREAD } from "../chat";
import { buildDisorderDemoPosts, scanDisorderSignals } from "./disorder-scan";

describe("disorder-scan", () => {
  it("builds intake posts that stay off family chat threads", () => {
    const posts = buildDisorderDemoPosts("elena", "alvarez");
    expect(posts.length).toBeGreaterThan(2);
    expect(posts.every((post) => post.threadId === CLINICAL_INTAKE_THREAD)).toBe(true);
    expect(posts.every((post) => post.channel === "whatsapp")).toBe(true);
  });

  it("tags bipolar, depression, PTSD, and OCD language for clinicians", () => {
    const posts = buildDisorderDemoPosts("elena", "alvarez");
    const hits = scanDisorderSignals(posts);
    const concerns = hits.map((hit) => hit.concern);
    expect(concerns).toContain("bipolar");
    expect(concerns).toContain("depression");
    expect(concerns).toContain("ptsd");
    expect(concerns).toContain("ocd");
  });

  it("returns a confidence percentage for each flagged concern", () => {
    const posts = buildDisorderDemoPosts("elena", "alvarez");
    const hits = scanDisorderSignals(posts);
    expect(hits.length).toBeGreaterThan(0);
    for (const hit of hits) {
      expect(hit.confidence).toBeGreaterThanOrEqual(52);
      expect(hit.confidence).toBeLessThanOrEqual(99);
    }
  });
});
