import { isClinicianUser } from "@/lib/auth";
import { seedDemoPatientAssignments } from "@/lib/clinical/assignments";
import { canClinicianAccessPatient, clinicalPatientById } from "@/lib/clinical/operations";
import {
  draftWeeklyClinicalBrief,
  runDeterministicClinicalTool,
  type ClinicalMuseTool,
} from "@/lib/clinical/muse-tools";
import { clinicalReportsForPatient, reviewClinicalReport } from "@/lib/clinical/reports";
import { isDemoMode } from "@/lib/mode-server";
import { NextRequest, NextResponse } from "next/server";

const TOOLS = new Set<ClinicalMuseTool>([
  "read_snapshot",
  "compare_baseline",
  "read_evidence",
  "draft_weekly_brief",
]);

async function authorizedPatient(memberId: string) {
  if (!(await isClinicianUser())) throw new Error("Clinician access required.");
  if (await isDemoMode()) seedDemoPatientAssignments();
  const access = await canClinicianAccessPatient(memberId);
  if (!access.allowed) throw new Error("This patient is assigned to another clinician.");
  if (!access.assigned) throw new Error("Add this patient to your roster before using clinician tools.");
  const patient = await clinicalPatientById(memberId);
  if (!patient) throw new Error("Patient snapshot not found.");
  return patient;
}

export async function GET(request: NextRequest) {
  try {
    const memberId = request.nextUrl.searchParams.get("memberId");
    if (!memberId) return NextResponse.json({ error: "memberId is required." }, { status: 400 });
    await authorizedPatient(memberId);
    return NextResponse.json({ reports: await clinicalReportsForPatient(memberId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Access denied." }, { status: 403 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { memberId?: string; tool?: ClinicalMuseTool };
    if (!body.memberId || !body.tool || !TOOLS.has(body.tool)) {
      return NextResponse.json({ error: "A patient and valid Muse tool are required." }, { status: 400 });
    }
    const patient = await authorizedPatient(body.memberId);
    const context = {
      snapshotId: patient.snapshotId,
      member: {
        id: patient.member.id,
        familyId: patient.member.familyId,
        name: patient.member.name,
        age: patient.member.age,
      },
      snapshot: patient.snapshot,
    };
    if (body.tool === "draft_weekly_brief") {
      const report = await draftWeeklyClinicalBrief(context);
      return NextResponse.json({ tool: body.tool, report });
    }
    return NextResponse.json({
      tool: body.tool,
      result: runDeterministicClinicalTool(body.tool, context),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Clinical Muse tool failed." },
      { status: 403 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await isClinicianUser())) {
      return NextResponse.json({ error: "Clinician access required." }, { status: 403 });
    }
    const body = (await request.json()) as { reportId?: string; memberId?: string; confirmed?: boolean };
    if (!body.reportId || !body.memberId || !body.confirmed) {
      return NextResponse.json({ error: "Explicit clinician confirmation is required." }, { status: 400 });
    }
    await authorizedPatient(body.memberId);
    const report = await reviewClinicalReport(body.reportId, body.memberId);
    if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not review report." }, { status: 400 });
  }
}
