import { describe, expect, it } from "vitest";
import {
  checkInReplyDraft,
  detectCheckInSuggestion,
  looksLikeCheckInText,
} from "./check-in";

describe("detectCheckInSuggestion", () => {
  it("offers a humane check-in for a difficult one-off message", () => {
    const result = detectCheckInSuggestion("I am not feeling well today");
    expect(result?.title).toBe("A gentle check-in may help");
    expect(result?.concern).toBe("mood");
    expect(result?.message).toContain("does not create a clinical alert");
  });

  it("does not interrupt an ordinary family update", () => {
    expect(detectCheckInSuggestion("The tomatoes are ready for Sunday lunch")).toBeNull();
  });

  it("recognizes cognitive language", () => {
    const result = detectCheckInSuggestion("I cannot find my keys again");
    expect(result?.concern).toBe("cognitive");
    expect(result?.label).toBe("Cognitive change");
  });

  it("recognizes anxiety language", () => {
    const result = detectCheckInSuggestion("My heart is pounding and I cannot calm down");
    expect(result?.concern).toBe("anxiety");
  });

  it("recognizes sleep disruption", () => {
    const result = detectCheckInSuggestion("I have been awake since 3am");
    expect(result?.concern).toBe("sleep");
  });

  it("recognizes trauma language", () => {
    const result = detectCheckInSuggestion("I had a flashback during dinner");
    expect(result?.concern).toBe("trauma");
  });

  it("recognizes substance use language", () => {
    const result = detectCheckInSuggestion("I started drinking again this week");
    expect(result?.concern).toBe("substance");
  });

  it("recognizes social withdrawal", () => {
    const result = detectCheckInSuggestion("Please leave me alone, I am cancelling everything");
    expect(result?.concern).toBe("withdrawal");
  });

  it("recognizes bipolar language", () => {
    const result = detectCheckInSuggestion("My bipolar is acting up and I am on a manic episode");
    expect(result?.concern).toBe("bipolar");
    expect(result?.label).toBe("Bipolar");
  });

  it("recognizes depression disorder language", () => {
    const result = detectCheckInSuggestion("My depression is worse this week");
    expect(result?.concern).toBe("depression");
  });

  it("recognizes PTSD language", () => {
    const result = detectCheckInSuggestion("My PTSD is acting up again");
    expect(result?.concern).toBe("ptsd");
  });

  it("recognizes OCD language", () => {
    const result = detectCheckInSuggestion("I cannot stop checking the locks because of my OCD");
    expect(result?.concern).toBe("ocd");
  });

  it("recognizes ADHD language", () => {
    const result = detectCheckInSuggestion("My ADHD brain will not slow down today");
    expect(result?.concern).toBe("adhd");
  });
});

describe("looksLikeCheckInText", () => {
  it("flags likely concern language", () => {
    expect(looksLikeCheckInText("Feeling hopeless tonight")).toBe(true);
  });

  it("ignores ordinary chat", () => {
    expect(looksLikeCheckInText("Pizza at 6?")).toBe(false);
  });
});

describe("checkInReplyDraft", () => {
  it("tailors drafts by concern area", () => {
    expect(checkInReplyDraft("Elena", "sleep")).toContain("sleep");
    expect(checkInReplyDraft("Elena", "substance")).toContain("no judgment");
  });
});
