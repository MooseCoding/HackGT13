import { authorizedClinicalPatient } from "@/lib/clinical/patient-access";
import { renderClinicalReportHtml, reportFileName } from "@/lib/clinical/report-document";
import { clinicalReportsForPatient } from "@/lib/clinical/reports";
import { isDemoMode } from "@/lib/mode-server";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { PatientSnapshot } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/clinical/reports/:id/download?memberId=…[&print=1]
 * Returns the weekly brief as a printable HTML document. Without `print` it is
 * sent as a file download; with `print=1` it opens inline and triggers the
 * browser's print dialog (Save as PDF).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memberId = request.nextUrl.searchParams.get("memberId");
  const print = request.nextUrl.searchParams.get("print") === "1";
  if (!memberId) return NextResponse.json({ error: "memberId is required." }, { status: 400 });

  try {
    const patient = await authorizedClinicalPatient(memberId);
    const report = (await clinicalReportsForPatient(memberId)).find((row) => row.id === id);
    if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });

    // Prefer the exact snapshot the brief was written from.
    let snapshot: PatientSnapshot = patient.snapshot;
    let snapshotMatchesReport = report.snapshotId === patient.snapshotId;
    if (!snapshotMatchesReport && !(await isDemoMode())) {
      const supabase = await createSupabaseServer();
      const { data } = await supabase
        .from("clinical_snapshots")
        .select("snapshot")
        .eq("id", report.snapshotId)
        .maybeSingle();
      if (data?.snapshot) {
        snapshot = data.snapshot as unknown as PatientSnapshot;
        snapshotMatchesReport = true;
      }
    }

    const html = renderClinicalReportHtml({
      report,
      patient: { name: patient.member.name, age: patient.member.age },
      snapshot,
      snapshotMatchesReport,
      autoPrint: print,
    });
    const fileName = reportFileName(patient.member.name, report.generatedAt);
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `${print ? "inline" : "attachment"}; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not prepare the report." },
      { status: 403 },
    );
  }
}
