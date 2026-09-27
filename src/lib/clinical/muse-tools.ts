import { aiChat, type AiSource } from "../ai/chat";
import { grokModel, museModel } from "../ai/config";
import { parseModelJson } from "../ai/json";
import type { PatientSnapshot } from "../types";
import { saveClinicalReport, type ClinicalReport } from "./reports";

export const CLINICAL_PROMPT_VERSION = "hcp-weekly-brief-v1";

export type ClinicalMuseTool =
  | "read_snapshot"
  | "compare_baseline"
  | "read_evidence"
  | "draft_weekly_brief";

export type ClinicalPatientContext = {
  snapshotId: string;
  member: { id: string; familyId: string; name: string; age: number };
  snapshot: PatientSnapshot;
};

function percent(value: number) {
  return `${value >= 0 ? "+" : ""}${Math.round(value * 100)}%`;
}

export function runDeterministicClinicalTool(tool: Exclude<ClinicalMuseTool, "draft_weekly_brief">, input: ClinicalPatientContext) {
  const snapshot = input.snapshot;
  if (tool === "read_snapshot") {
    return {
      tool,
      summary: snapshot.note,
      riskLevel: snapshot.riskLevel,
      confidence: snapshot.confidence,
      assessedAt: snapshot.assessedAt,
      sampleSizes: { current: snapshot.currentSampleSize, baseline: snapshot.baselineSampleSize },
      flags: snapshot.flags.map((flag) => ({ code: flag.code, title: flag.title, severity: flag.severity })),
    };
  }
  if (tool === "compare_baseline") {
    const voiceWpmDelta =
      snapshot.voice.wordsPerMinute !== null && snapshot.voice.wordsPerMinuteBaseline
        ? percent(snapshot.voice.wordsPerMinute / snapshot.voice.wordsPerMinuteBaseline - 1)
        : null;
    const voicePauseDelta =
      snapshot.voice.pauseRatio !== null && snapshot.voice.pauseRatioBaseline !== null
        ? `${snapshot.voice.pauseRatio - snapshot.voice.pauseRatioBaseline >= 0 ? "+" : ""}${Math.round((snapshot.voice.pauseRatio - snapshot.voice.pauseRatioBaseline) * 100)} pts`
        : null;
    const voiceHesitationDelta =
      snapshot.voice.hesitationRate !== null && snapshot.voice.hesitationRateBaseline !== null
        ? `${snapshot.voice.hesitationRate - snapshot.voice.hesitationRateBaseline >= 0 ? "+" : ""}${Math.round((snapshot.voice.hesitationRate - snapshot.voice.hesitationRateBaseline) * 100)} pts`
        : null;
    const changes = [
      { metric: "Lexical diversity", delta: percent(snapshot.lexicalDiversityDelta) },
      { metric: "Sentence length", delta: percent(snapshot.sentenceLengthDelta) },
      { metric: "Repetition", delta: percent(snapshot.repetitionDelta) },
      { metric: "Engagement", delta: percent(snapshot.engagementDelta) },
      { metric: "Morning activity", delta: percent(snapshot.morningShareDelta) },
      {
        metric: "Late-night activity",
        delta: `${snapshot.nightShare - snapshot.nightShareBaseline >= 0 ? "+" : ""}${Math.round((snapshot.nightShare - snapshot.nightShareBaseline) * 100)} pts`,
      },
      { metric: "Sentiment", delta: percent(snapshot.sentimentDelta) },
      ...(snapshot.responseLatencyDelta !== null
        ? [{ metric: "Reply time", delta: percent(snapshot.responseLatencyDelta) }]
        : []),
      ...(voiceWpmDelta ? [{ metric: "Speech pace (WPM)", delta: voiceWpmDelta }] : []),
      ...(voicePauseDelta ? [{ metric: "Voice pause share", delta: voicePauseDelta }] : []),
      ...(voiceHesitationDelta ? [{ metric: "Hesitation rate", delta: voiceHesitationDelta }] : []),
    ];
    return {
      tool,
      windowDays: snapshot.windowDays,
      baselineDays: snapshot.baselineDays,
      changes,
      flags: snapshot.flags.map((flag) => ({
        code: flag.code,
        summary: flag.detail,
        current: flag.current,
        baseline: flag.baseline,
      })),
    };
  }
  return {
    tool,
    privacy: "Message text is withheld from the model and this response.",
    evidence: snapshot.insight.evidence.map((evidence) => ({
      evidenceId: evidence.postId,
      observedAt: evidence.createdAt,
      tags: evidence.tags ?? [],
    })),
  };
}

function deterministicBrief(input: ClinicalPatientContext) {
  const snapshot = input.snapshot;
  const findings = snapshot.flags.slice(0, 4).map((flag) => {
    const evidence = snapshot.insight.evidence
      .filter((item) =>
        flag.code === "voice_change"
          ? item.tags?.includes("voice")
          : true,
      )
      .slice(0, 2)
      .map((item) => item.postId);
    const cite = evidence.length ? ` · evidence ${evidence.join(", ")}` : "";
    return `${flag.detail} (${flag.current} vs ${flag.baseline})${cite}`;
  });
  return {
    brief: snapshot.note,
    findings: findings.length ? findings : ["No material shift from the personal baseline was detected."],
    recommendedNextStep: snapshot.nextStep,
  };
}

function generationPayload(input: ClinicalPatientContext) {
  return {
    patient: { id: input.member.id, age: input.member.age },
    snapshotId: input.snapshotId,
    riskLevel: input.snapshot.riskLevel,
    confidence: input.snapshot.confidence,
    assessedAt: input.snapshot.assessedAt,
    windows: { currentDays: input.snapshot.windowDays, baselineDays: input.snapshot.baselineDays },
    metrics: runDeterministicClinicalTool("compare_baseline", input),
    flags: input.snapshot.flags.map((flag) => ({
      code: flag.code,
      domain: flag.domain,
      severity: flag.severity,
      current: flag.current,
      baseline: flag.baseline,
    })),
    evidenceIds: input.snapshot.insight.evidence.map((evidence) => evidence.postId),
    deterministicSummary: input.snapshot.note,
    deterministicNextStep: input.snapshot.nextStep,
  };
}

function modelName(source: AiSource) {
  return source === "muse" ? museModel() : grokModel();
}

export async function draftWeeklyClinicalBrief(
  input: ClinicalPatientContext,
  options?: { system?: boolean },
): Promise<ClinicalReport> {
  let draft = deterministicBrief(input);
  let source: AiSource | "local" = "local";
  try {
    const generated = await aiChat({
      json: true,
      reasoningEffort: "minimal",
      temperature: 0.1,
      maxTokens: 1200,
      messages: [
        {
          role: "system",
          content: [
            "You are Muse operating in clinician-report mode.",
            "Write a concise weekly screening brief from deterministic metrics only.",
            "Do not diagnose, prescribe, or invent facts. Distinguish observation from interpretation.",
            "Return JSON with brief (2-3 sentences), findings (1-3 strings), and recommendedNextStep.",
          ].join(" "),
        },
        { role: "user", content: JSON.stringify(generationPayload(input)) },
      ],
    });
    const parsed = parseModelJson<{ brief?: unknown; findings?: unknown; recommendedNextStep?: unknown }>(generated.content);
    if (
      typeof parsed.brief === "string" && parsed.brief.trim() &&
      Array.isArray(parsed.findings) && parsed.findings.every((finding) => typeof finding === "string") &&
      typeof parsed.recommendedNextStep === "string" && parsed.recommendedNextStep.trim()
    ) {
      draft = {
        brief: parsed.brief.trim(),
        findings: parsed.findings.map((finding) => finding.trim()).filter(Boolean).slice(0, 3),
        recommendedNextStep: parsed.recommendedNextStep.trim(),
      };
      source = generated.source;
    }
  } catch (error) {
    console.error("Clinical brief generation failed; keeping deterministic brief.", error);
  }

  return saveClinicalReport({
    snapshotId: input.snapshotId,
    memberId: input.member.id,
    familyId: input.member.familyId,
    brief: draft.brief,
    findings: draft.findings,
    recommendedNextStep: draft.recommendedNextStep,
    evidenceIds: input.snapshot.insight.evidence.map((evidence) => evidence.postId),
    modelProvider: source,
    modelName: source === "local" ? "deterministic-clinical-engine-v1" : modelName(source),
    promptVersion: CLINICAL_PROMPT_VERSION,
    status: "draft",
    generatedAt: new Date().toISOString(),
    reviewedAt: null,
    reviewedBy: null,
  }, options);
}
