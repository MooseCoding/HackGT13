import { describe, expect, it } from "vitest";
import { suggestReminderFromText } from "./remind-detect";
import type { Member } from "./types";

const members: Member[] = [
  {
    id: "nish",
    familyId: "hackgt",
    name: "nish",
    role: "adult",
    age: 22,
    initials: "N",
    color: "#c45",
    location: "Atlanta",
    clinicalOptIn: false,
  },
  {
    id: "miguel",
    familyId: "hackgt",
    name: "Miguel Alvarez",
    role: "adult",
    age: 45,
    initials: "MA",
    color: "#4a8",
    location: "Atlanta",
    clinicalOptIn: false,
  },
];

describe("suggestReminderFromText", () => {
  it("assigns 'remind me' reminders to the author and parses tomorrow", () => {
    const anchor = new Date("2026-09-27T15:00:00.000Z");
    const suggestion = suggestReminderFromText(
      "Remind me to call Mom tomorrow",
      members,
      "nish",
      anchor,
    );
    expect(suggestion).not.toBeNull();
    expect(suggestion?.assigneeId).toBe("nish");
    expect(suggestion?.dueHint.toLowerCase()).toContain("tomorrow");
    expect(suggestion?.text.toLowerCase()).toContain("call mom");
    expect(suggestion?.text.toLowerCase()).not.toContain("tomorrow");
  });

  it("still resolves remind <name> to a circle member", () => {
    const suggestion = suggestReminderFromText(
      "Remind Miguel to pick up milk Friday",
      members,
      "nish",
      new Date("2026-09-27T15:00:00.000Z"),
    );
    expect(suggestion?.assigneeId).toBe("miguel");
    expect(suggestion?.text.toLowerCase()).toContain("pick up");
  });
});
