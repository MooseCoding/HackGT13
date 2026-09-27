import type { ClinicalFlag, PatientSnapshot } from "@/lib/types";

/** One judge-readable feature delta line, optionally tied to supporting evidence ids. */
export type FeatureDeltaLine = {
  code: string;
  title: string;
  summary: string;
  current: string;
  baseline: string;
  evidenceIds: string[];
};

function voiceEvidenceIds(snapshot: PatientSnapshot): string[] {
  return snapshot.insight.evidence
    .filter((item) => item.tags?.some((tag) => /voice|pace|pause|hesitat/i.test(tag)))
    .map((item) => item.postId);
}

function evidenceForFlag(flag: ClinicalFlag, snapshot: PatientSnapshot): string[] {
  if (flag.code === "voice_change") return voiceEvidenceIds(snapshot);
  if (flag.code === "sleep_shift") {
    return snapshot.insight.evidence
      .filter((item) => item.tags?.some((tag) => /night|late|sleep|timing/i.test(tag)))
      .map((item) => item.postId);
  }
  // Fall back to the global evidence list (still useful for judges).
  return snapshot.insight.evidence.map((item) => item.postId).slice(0, 4);
}

/** Exact feature deltas from the live snapshot flags (current → baseline). */
export function featureDeltasFromSnapshot(snapshot: PatientSnapshot): FeatureDeltaLine[] {
  return snapshot.flags.map((flag) => ({
    code: flag.code,
    title: flag.title,
    summary: flag.detail,
    current: flag.current,
    baseline: flag.baseline,
    evidenceIds: evidenceForFlag(flag, snapshot),
  }));
}

/** Compact one-liner for UI chips and Muse findings. */
export function formatFeatureDelta(flag: Pick<ClinicalFlag, "title" | "current" | "baseline">): string {
  return `${flag.title}: ${flag.current} vs ${flag.baseline}`;
}
