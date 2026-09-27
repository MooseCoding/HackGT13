import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { analyzeMember } from "@/lib/analysis";
import {
  buildBriefFromSnapshot,
  evalCaseToPosts,
  evaluateBriefAgainstCase,
  type EvalCase,
} from "@/lib/clinical/hcp-brief";
import casesPackage from "./cases.json";

const REFERENCE = new Date("2026-09-25T20:16:00-04:00");
const __dirname = dirname(fileURLToPath(import.meta.url));

const cases = casesPackage.cases as EvalCase[];

describe("Familyr HCP brief eval package", () => {
  it("has five stable and five review_suggested cases with 20–50 messages", () => {
    expect(cases).toHaveLength(10);
    expect(cases.filter((item) => item.expected_label === "stable")).toHaveLength(5);
    expect(cases.filter((item) => item.expected_label === "review_suggested")).toHaveLength(5);
    for (const item of cases) {
      expect(item.messages.length).toBeGreaterThanOrEqual(20);
      expect(item.messages.length).toBeLessThanOrEqual(50);
    }
  });

  it("runs P01 (stable) and P06 (concerning) end-to-end first", () => {
    for (const id of ["P01", "P06"] as const) {
      const evalCase = cases.find((item) => item.patient_id === id)!;
      const posts = evalCaseToPosts(evalCase);
      const snapshot = analyzeMember(id, posts, REFERENCE);
      const brief = buildBriefFromSnapshot(id, snapshot, evalCase, evalCase.benign_explanation);
      const result = evaluateBriefAgainstCase(evalCase, snapshot, brief);

      expect(result.checks.no_forbidden_claims).toBe(true);
      expect(result.sample_sizes.baseline).toBeGreaterThanOrEqual(4);
      expect(result.sample_sizes.current).toBeGreaterThanOrEqual(3);
      if (id === "P01") {
        expect(result.pipeline_status).toBe("stable");
        expect(result.checks.stable_avoids_alarm).toBe(true);
      } else {
        expect(result.pipeline_status).toBe("review_suggested");
        expect(result.checks.concerning_prompts_review).toBe(true);
        expect(result.flag_codes.length).toBeGreaterThan(0);
      }
    }
  });

  it("runs all ten cases through analyzeMember and writes pipeline-results.json", () => {
    const results = cases.map((evalCase) => {
      const posts = evalCaseToPosts(evalCase);
      const snapshot = analyzeMember(evalCase.patient_id, posts, REFERENCE);
      const brief = buildBriefFromSnapshot(
        evalCase.patient_id,
        snapshot,
        evalCase,
        evalCase.benign_explanation,
      );
      return evaluateBriefAgainstCase(evalCase, snapshot, brief);
    });

    writeFileSync(
      join(__dirname, "pipeline-results.json"),
      `${JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          reference_datetime: REFERENCE.toISOString(),
          summary: {
            total: results.length,
            label_matches: results.filter((item) => item.label_match).length,
            forbidden_free: results.filter((item) => item.checks.no_forbidden_claims).length,
            stable_ok: results.filter((item) => item.checks.stable_avoids_alarm).length,
            concerning_ok: results.filter((item) => item.checks.concerning_prompts_review).length,
          },
          results,
        },
        null,
        2,
      )}\n`,
    );

    for (const result of results) {
      expect(result.checks.no_forbidden_claims, result.patient_id).toBe(true);
      expect(result.checks.stable_avoids_alarm, result.patient_id).toBe(true);
      expect(result.checks.concerning_prompts_review, result.patient_id).toBe(true);
      if (!result.label_match) {
        console.warn(
          `${result.patient_id} label mismatch: expected=${result.expected_label} pipeline=${result.pipeline_status} flags=${result.flag_codes.join(",")}`,
        );
      }
    }

    const matches = results.filter((item) => item.label_match).length;
    expect(matches).toBe(10);
  });
});
