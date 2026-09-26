import { isClinicianUser } from "@/lib/auth";
import {
  assignPatientToClinician,
  currentClinicianId,
  listPatientAssignments,
  releasePatientAssignment,
} from "@/lib/clinical/assignments";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  if (!(await isClinicianUser())) {
    return NextResponse.json({ error: "Clinician access required." }, { status: 403 });
  }
  const clinicianId = await currentClinicianId();
  const assignments = await listPatientAssignments();
  return NextResponse.json({
    assignments,
    mine: clinicianId ? assignments.filter((assignment) => assignment.clinicianId === clinicianId) : [],
  });
}

export async function POST(request: NextRequest) {
  if (!(await isClinicianUser())) {
    return NextResponse.json({ error: "Clinician access required." }, { status: 403 });
  }
  const clinicianId = await currentClinicianId();
  if (!clinicianId) {
    return NextResponse.json({ error: "Clinician session required." }, { status: 401 });
  }

  const body = (await request.json()) as { memberId?: string };
  if (!body.memberId?.trim()) {
    return NextResponse.json({ error: "A patient member id is required." }, { status: 400 });
  }

  try {
    const assignment = await assignPatientToClinician(body.memberId.trim(), clinicianId);
    return NextResponse.json({ assignment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not assign patient.";
    const status = message.includes("already assigned") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

const RELEASE_REASONS = new Set(["transfer", "discharge", "patient-request", "coverage-gap"]);

export async function DELETE(request: NextRequest) {
  if (!(await isClinicianUser())) {
    return NextResponse.json({ error: "Clinician access required." }, { status: 403 });
  }
  const clinicianId = await currentClinicianId();
  if (!clinicianId) {
    return NextResponse.json({ error: "Clinician session required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { memberId?: string; reason?: string };
  const memberId = body.memberId?.trim() || request.nextUrl.searchParams.get("memberId")?.trim();
  const reason = body.reason?.trim();
  if (!memberId) {
    return NextResponse.json({ error: "memberId is required." }, { status: 400 });
  }
  if (!reason || !RELEASE_REASONS.has(reason)) {
    return NextResponse.json({ error: "A valid release reason is required." }, { status: 400 });
  }

  try {
    const released = await releasePatientAssignment(memberId, clinicianId);
    if (!released) return NextResponse.json({ error: "Patient is not on your roster." }, { status: 404 });
    return NextResponse.json({ released: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not release patient." },
      { status: 400 },
    );
  }
}
