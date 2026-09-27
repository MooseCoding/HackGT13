import { describe, expect, it } from "vitest";
import { chunkForSpeech } from "./elevenlabs";

describe("chunkForSpeech", () => {
  it("keeps short text as one chunk", () => {
    expect(chunkForSpeech("Hello family.")).toEqual(["Hello family."]);
  });

  it("splits long text on sentence boundaries", () => {
    const sentence = "This is a warm family update. ";
    const text = sentence.repeat(200);
    const chunks = chunkForSpeech(text, 120);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 120 || c.includes("."))).toBe(true);
    expect(chunks.join(" ").replace(/\s+/g, " ").trim().length).toBeGreaterThan(100);
  });
});
