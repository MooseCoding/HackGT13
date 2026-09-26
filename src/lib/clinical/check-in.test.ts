import { describe, expect, it } from "vitest";
import { detectCheckInSuggestion } from "./check-in";

describe("detectCheckInSuggestion", () => {
  it("offers a humane check-in for a difficult one-off message", () => {
    const result = detectCheckInSuggestion("I am not feeling well today");
    expect(result?.title).toBe("A gentle check-in may help");
    expect(result?.message).toContain("does not create a clinical alert");
  });

  it("does not interrupt an ordinary family update", () => {
    expect(detectCheckInSuggestion("The tomatoes are ready for Sunday lunch")).toBeNull();
  });
});
