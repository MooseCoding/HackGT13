import type { PatientSnapshot, Post } from "@/lib/types";

export type HcpBriefStatus = "stable" | "review_suggested";

/** Kept in sync with eval/hcp-brief/rules.json forbidden_phrase_patterns. */
export const FORBIDDEN_PHRASE_PATTERNS = [
  // Allow explicit non-claims like "not a diagnosis"; flag affirmative diagnostic language.
  "(?<!not a )\\bdiagnos(?:e|is|ed)\\b",
  "\\bdementia\\b",
  "\\bAlzheimer",
  "\\bMCI\\b",
  "\\bdepression\\b",
  "\\banxiety disorder\\b",
  "\\bprobability\\b",
  "\\blikelihood\\b",
  "\\bprescribe\\b",
  "\\bmedication change\\b",
  "\\btreatment plan\\b",
  "\\bno symptoms? (because|since) (they|she|he) (did not|didn't) (post|message|text)",
  "\\bsilence (means|proves|shows) (no|absence)",
];

export type SuggestedClinicianAction =
  | "review_evidence"
  | "contact_patient_or_caregiver"
  | "consider_clinical_screening"
  | "document_and_monitor";

export type HcpBriefChange = {
  code: string;
  summary: string;
  current?: string;
  baseline?: string;
};

export type HearthWeeklyHcpBrief = {
  patient_id: string;
  reporting_period: {
    baseline_window: { start: string; end: string };
    current_window: { start: string; end: string };
  };
  headline: string;
  status: HcpBriefStatus;
  changes: HcpBriefChange[];
  evidence_ids: string[];
  limitations: string[];
  suggested_clinician_actions: SuggestedClinicianAction[];
};

export type EvalCaseMessage = {
  id: string;
  speaker_id: string;
  created_at: string;
  body: string;
  kind?: "text" | "voice";
  voice_metrics?: {
    wordsPerMinute?: number;
    pauseRatio?: number;
    hesitationRate?: number;
  };
};

export type EvalCase = {
  patient_id: string;
  display_name: string;
  baseline_window: { start: string; end: string };
  current_window: { start: string; end: string };
  messages: EvalCaseMessage[];
  expected_label: HcpBriefStatus;
  label_reason: string;
  expected_evidence_ids: string[];
  benign_explanation: string;
};

export function snapshotStatus(snapshot: PatientSnapshot): HcpBriefStatus {
  return snapshot.riskLevel === "stable" ? "stable" : "review_suggested";
}

export function actionsFor(status: HcpBriefStatus, flagCount: number): SuggestedClinicianAction[] {
  if (status === "stable") return ["document_and_monitor"];
  if (flagCount >= 3) {
    return ["review_evidence", "contact_patient_or_caregiver", "consider_clinical_screening"];
  }
  return ["review_evidence", "contact_patient_or_caregiver"];
}

/** Deterministic Hearth brief from the live analysis snapshot (pipeline ground truth). */
export function buildBriefFromSnapshot(
  patientId: string,
  snapshot: PatientSnapshot,
  windows: Pick<EvalCase, "baseline_window" | "current_window">,
  benignExplanation?: string,
): HearthWeeklyHcpBrief {
  const status = snapshotStatus(snapshot);
  const evidence_ids = snapshot.insight.evidence.map((item) => item.postId);
  const changes: HcpBriefChange[] =
    snapshot.flags.length === 0
      ? [
          {
            code: "none_material",
            summary:
              snapshot.insight.status === "insufficient_data"
                ? snapshot.insight.summary
                : "No material personal-baseline shifts were detected in this window.",
          },
        ]
      : snapshot.flags.map((flag) => ({
          code: flag.code,
          summary: flag.detail,
          current: flag.current,
          baseline: flag.baseline,
        }));

  const headline =
    status === "stable"
      ? `No material personal-baseline shift detected for ${patientId} versus the prior ${snapshot.baselineDays}-day baseline.`
      : `${snapshot.insight.title}. Review suggested — decision support for clinician judgment only.`;

  const limitations = [
    "Signals reflect consented family communication patterns, not a clinical examination.",
    "Changes may reflect travel, device access, illness, housing moves, or family dynamics.",
    "Absence of chat does not prove absence of symptoms.",
    ...(benignExplanation ? [benignExplanation] : []),
  ];

  return {
    patient_id: patientId,
    reporting_period: {
      baseline_window: windows.baseline_window,
      current_window: windows.current_window,
    },
    headline,
    status,
    changes,
    evidence_ids,
    limitations,
    suggested_clinician_actions: actionsFor(status, snapshot.flags.length),
  };
}

export function evalCaseToPosts(evalCase: EvalCase): Post[] {
  return evalCase.messages.map((message) => ({
    id: message.id,
    familyId: `family-${evalCase.patient_id}`,
    authorId: message.speaker_id,
    kind: message.kind === "voice" ? "voice" : "text",
    body: message.body,
    transcript: message.kind === "voice" ? message.body : undefined,
    createdAt: message.created_at,
    audioMetrics: message.voice_metrics
      ? {
          durationSeconds: 12,
          averagePauseSeconds: 0.4,
          wordsPerMinute: message.voice_metrics.wordsPerMinute ?? 120,
          pauseRatio: message.voice_metrics.pauseRatio ?? 0.1,
          hesitationRate: message.voice_metrics.hesitationRate ?? 0.05,
        }
      : undefined,
  }));
}

export function forbiddenClaimHits(text: string): string[] {
  const patterns = FORBIDDEN_PHRASE_PATTERNS.map((source) => new RegExp(source, "i"));
  return patterns.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
}

export type CaseEvalResult = {
  patient_id: string;
  expected_label: HcpBriefStatus;
  pipeline_status: HcpBriefStatus;
  pipeline_risk_level: PatientSnapshot["riskLevel"];
  label_match: boolean;
  evidence_overlap: string[];
  expected_evidence_cited: boolean;
  forbidden_hits: string[];
  sample_sizes: { current: number; baseline: number };
  flag_codes: string[];
  brief: HearthWeeklyHcpBrief;
  checks: {
    stable_avoids_alarm: boolean;
    concerning_prompts_review: boolean;
    no_forbidden_claims: boolean;
  };
};

export function evaluateBriefAgainstCase(
  evalCase: EvalCase,
  snapshot: PatientSnapshot,
  brief: HearthWeeklyHcpBrief,
): CaseEvalResult {
  const pipeline_status = snapshotStatus(snapshot);
  const evidence_overlap = brief.evidence_ids.filter((id) => evalCase.expected_evidence_ids.includes(id));
  const blob = [brief.headline, ...brief.changes.map((change) => change.summary), ...brief.limitations].join("\n");
  const forbidden_hits = forbiddenClaimHits(blob);
  const stable_avoids_alarm =
    evalCase.expected_label !== "stable" ||
    (pipeline_status === "stable" && !/priority|urgent|emergency|diagnos/i.test(brief.headline));
  const concerning_prompts_review =
    evalCase.expected_label !== "review_suggested" ||
    (pipeline_status === "review_suggested" && brief.suggested_clinician_actions.includes("review_evidence"));

  return {
    patient_id: evalCase.patient_id,
    expected_label: evalCase.expected_label,
    pipeline_status,
    pipeline_risk_level: snapshot.riskLevel,
    label_match: pipeline_status === evalCase.expected_label,
    evidence_overlap,
    expected_evidence_cited: evidence_overlap.length > 0 || evalCase.expected_label === "stable",
    forbidden_hits,
    sample_sizes: {
      current: snapshot.currentSampleSize,
      baseline: snapshot.baselineSampleSize,
    },
    flag_codes: snapshot.flags.map((flag) => flag.code),
    brief,
    checks: {
      stable_avoids_alarm,
      concerning_prompts_review,
      no_forbidden_claims: forbidden_hits.length === 0,
    },
  };
}
