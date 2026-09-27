import { describe, expect, it } from "vitest";
import { analyzeMember } from "../analysis";
import type { Member, Post } from "../types";
import { runDeterministicClinicalTool } from "./muse-tools";

const member = {
  id: "patient",
  familyId: "family",
  name: "Mock Patient",
  role: "Parent",
  age: 70,
  initials: "MP",
  color: "#123456",
  location: "Atlanta",
} satisfies Member;

function post(id: string, createdAt: string, body: string): Post {
  return { id, familyId: "family", authorId: "patient", kind: "text", body, createdAt, threadId: "group" };
}

const posts = [
  post("base-1", "2026-08-20T10:00:00-04:00", "I walked through the garden and called my sister afterward."),
  post("base-2", "2026-08-24T10:00:00-04:00", "We cooked dinner together and planned a picnic."),
  post("base-3", "2026-08-28T10:00:00-04:00", "The neighborhood meeting was lively and useful."),
  post("base-4", "2026-09-01T10:00:00-04:00", "I finished my book and shared it with James."),
  post("recent-1", "2026-09-18T23:30:00-04:00", "Hard day. I forgot again."),
  post("recent-2", "2026-09-21T23:45:00-04:00", "Hard day. I forgot again."),
  post("recent-3", "2026-09-24T23:15:00-04:00", "Hard day. I forgot again."),
];

const snapshot = analyzeMember("patient", posts, new Date("2026-09-26T12:00:00-04:00"));
const context = { snapshotId: "mock-snapshot", member, snapshot };

describe("clinician Muse tools", () => {
  it("reads only deterministic snapshot fields", () => {
    const result = runDeterministicClinicalTool("read_snapshot", context);
    expect(result.tool).toBe("read_snapshot");
    expect(result).toHaveProperty("riskLevel");
  });

  it("compares metrics against the personal baseline", () => {
    const result = runDeterministicClinicalTool("compare_baseline", context);
    expect(result.tool).toBe("compare_baseline");
    expect(result.changes).toHaveLength(6);
  });

  it("returns evidence identifiers while withholding message text", () => {
    const result = runDeterministicClinicalTool("read_evidence", context);
    expect(result.tool).toBe("read_evidence");
    expect(JSON.stringify(result)).not.toContain("Hard day");
    expect(result.privacy).toContain("withheld");
  });
});
