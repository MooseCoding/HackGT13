import { runPersistedClinicalAnalysis } from "@/lib/clinical/operations";
import { optedInPatients } from "@/lib/data";
import { isDemoMode } from "@/lib/mode-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Daily autonomous triage worker. Vercel Cron sends CRON_SECRET as a bearer
 * token in production; local demo mode can invoke the endpoint without one.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }
  if (secret && authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isDemoMode())) {
    try {
      const result = await runPersistedClinicalAnalysis();
      return NextResponse.json({
        analyzedAt: result.analyzedAt,
        runId: result.runId,
        optedInPatients: result.patients.length,
        queuedForReview: result.queuedCount,
        persisted: true,
        disclaimer: "Screening signals only; clinician review required.",
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Clinical analysis failed." },
        { status: 500 },
      );
    }
  }

  const patients = await optedInPatients();
  const analyzedAt = new Date().toISOString();
  const queue = patients
    .filter((patient) => patient.riskLevel !== "stable")
    .map((patient) => ({
      memberId: patient.memberId,
      riskLevel: patient.riskLevel,
      confidence: patient.confidence,
      signals: patient.flags.map((flag) => ({
        code: flag.code,
        domain: flag.domain,
        severity: flag.severity,
        current: flag.current,
        baseline: flag.baseline,
      })),
      summary: patient.note,
      suggestedAction: patient.nextStep,
    }));

  return NextResponse.json({
    analyzedAt,
    optedInPatients: patients.length,
    queuedForReview: queue.length,
    queue,
    persisted: false,
    disclaimer: "Screening signals only; clinician review required.",
  });
}
