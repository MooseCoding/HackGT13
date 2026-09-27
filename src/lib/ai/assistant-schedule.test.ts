import { beforeEach, describe, expect, it, vi } from "vitest";
import { runFamilyAssistant } from "./assistant";
import type { FamilyToolRuntime } from "./family-tools";
import type { Member } from "@/lib/types";

vi.mock("@/lib/mode-server", () => ({
  isDemoMode: async () => true,
}));

const members: Member[] = [
  {
    id: "nish",
    familyId: "hackgt",
    name: "nish",
    role: "Parent",
    clinicalOptIn: false,
    age: 21,
    initials: "N",
    color: "#128c7e",
  },
];

const runtime: FamilyToolRuntime = {
  familyId: "hackgt",
  memberId: "nish",
  members,
  events: [],
  anchor: new Date("2026-09-26T12:00:00-04:00"),
};

describe("family assistant schedule force-path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("drafts school dropoff without waiting on Muse tools", async () => {
    const result = await runFamilyAssistant({
      message: "set school dropoff on October 1 at 8am",
      runtime,
    });
    expect(result.pending?.kind).toBe("event");
    expect(result.reply.toLowerCase()).toContain("draft ready");
    expect(result.reply.toLowerCase()).not.toContain("can't add");
  });

  it("creates the event when user says do it yourself after a schedule ask", async () => {
    const result = await runFamilyAssistant({
      message: "do it yourself",
      history: [
        { role: "user", content: "set school dropoff on October 1 at 8am" },
        { role: "assistant", content: "I can't add it for you just yet." },
      ],
      runtime,
    });
    expect(result.pending).toBeNull();
    expect(result.reply.toLowerCase()).toMatch(/created|calendar/);
  });
});
