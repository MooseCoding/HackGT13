import { optedInPatients } from "@/lib/data";
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
  if (secret && authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    disclaimer: "Screening signals only; clinician review required.",
  });
}
