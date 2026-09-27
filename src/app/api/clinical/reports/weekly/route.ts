import { draftWeeklyClinicalBrief, type ClinicalPatientContext } from "@/lib/clinical/muse-tools";
import { runPersistedClinicalAnalysis } from "@/lib/clinical/operations";
import { allMembers, optedInPatients } from "@/lib/data";
import { isDemoMode } from "@/lib/mode-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV === "production") return false;
  return !secret || request.headers.get("authorization") === `Bearer ${secret}`;
}

async function contextsForWeeklyRun(): Promise<{
  runId: string;
  analyzedAt: string;
  contexts: ClinicalPatientContext[];
}> {
  if (!(await isDemoMode())) {
    const analysis = await runPersistedClinicalAnalysis();
    return {
      runId: analysis.runId,
      analyzedAt: analysis.analyzedAt,
      contexts: analysis.persistedPatients.map((patient) => ({
        snapshotId: patient.snapshotId,
        member: {
          id: patient.member.id,
          familyId: patient.member.familyId,
          name: patient.member.name,
          age: patient.member.age,
        },
        snapshot: patient.snapshot,
      })),
    };
  }

  const [snapshots, members] = await Promise.all([optedInPatients(), allMembers()]);
  const memberById = new Map(members.map((member) => [member.id, member]));
  const contexts = snapshots.flatMap((snapshot) => {
    const member = memberById.get(snapshot.memberId);
    if (!member) return [];
    return [{
      snapshotId: `demo-${member.id}-${snapshot.assessedAt}`,
      member: {
        id: member.id,
        familyId: member.familyId,
        name: member.name,
        age: member.age,
      },
      snapshot,
    }];
  });
  return { runId: "demo-weekly", analyzedAt: new Date().toISOString(), contexts };
}

/** Weekly snapshot → Muse brief → persisted draft workflow. */
export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const run = await contextsForWeeklyRun();
    const reports = [];
    const failures: Array<{ memberId: string; error: string }> = [];

    // Sequential generation avoids provider bursts and makes partial failures auditable.
    for (const context of run.contexts) {
      try {
        reports.push(await draftWeeklyClinicalBrief(context, { system: true }));
      } catch (error) {
        failures.push({
          memberId: context.member.id,
          error: error instanceof Error ? error.message : "Report generation failed.",
        });
      }
    }

    const providers = reports.reduce<Record<string, number>>((counts, report) => {
      counts[report.modelProvider] = (counts[report.modelProvider] ?? 0) + 1;
      return counts;
    }, {});

    return NextResponse.json({
      ok: failures.length === 0,
      runId: run.runId,
      analyzedAt: run.analyzedAt,
      optedInPatients: run.contexts.length,
      draftReports: reports.length,
      providers,
      failures,
      status: "Drafts await clinician review.",
      disclaimer: "Screening support only; no autonomous diagnosis or outreach.",
    }, { status: failures.length === run.contexts.length && run.contexts.length ? 500 : 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Weekly clinical workflow failed." },
      { status: 500 },
    );
  }
}
