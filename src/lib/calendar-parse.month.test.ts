import { describe, expect, it } from "vitest";
import { parseEvent } from "./calendar-parse";
import type { Member } from "./types";

const members: Member[] = [
  {
    id: "me",
    familyId: "fam",
    name: "Olivia Test",
    role: "Parent",
    clinicalOptIn: false,
  },
];

describe("parseEvent month dates", () => {
  it("parses October 1 for school dropoff", () => {
    const anchor = new Date("2026-09-26T12:00:00-04:00");
    const event = parseEvent("school dropoff on October 1 at 8am", members, "me", "fam", anchor);
    expect(event.title.toLowerCase()).toContain("school");
    const start = new Date(event.startsAt);
    expect(start.getMonth()).toBe(9);
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(8);
  });
});
