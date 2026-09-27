import { describe, expect, it } from "vitest";
import { executeFamilyTool, type FamilyToolRuntime } from "./family-tools";
import type { Member } from "@/lib/types";

const members: Member[] = [
  {
    id: "olivia",
    familyId: "hackgt",
    name: "Olivia",
    role: "Parent",
    clinicalOptIn: false,
  },
];

const runtime: FamilyToolRuntime = {
  familyId: "hackgt",
  memberId: "olivia",
  members,
  events: [],
  anchor: new Date("2026-09-26T12:00:00-04:00"),
};

describe("family assistant tools", () => {
  it("drafts a calendar event for October 1", async () => {
    const result = await executeFamilyTool(
      "draft_calendar_event",
      { text: "school dropoff on October 1 at 8am" },
      runtime,
    );
    expect(result.ok).toBe(true);
    expect(result.pending?.kind).toBe("event");
    if (result.pending?.kind === "event") {
      expect(result.pending.when.toLowerCase()).toContain("oct");
      expect(result.pending.title.toLowerCase()).toMatch(/school|dropoff/);
    }
  });

  it("checks today availability", async () => {
    const result = await executeFamilyTool("check_today_availability", {}, runtime);
    expect(result.ok).toBe(true);
    expect(result.summary.toLowerCase()).toContain("no family events");
  });

  it("allowlists navigation", async () => {
    const result = await executeFamilyTool("navigate_app", { destination: "calendar" }, runtime);
    expect(result.ok).toBe(true);
    expect(result.pending?.kind).toBe("navigate");
  });
});
