import { isClinicianUser } from "@/lib/auth";
import {
  autoAssignInNetworkPatients,
  getAutoAcceptPatients,
  setAutoAcceptPatients,
} from "@/lib/clinical/auto-assign";
import { currentClinicianId } from "@/lib/clinical/assignments";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  if (!(await isClinicianUser())) {
    return NextResponse.json({ error: "Clinician access required." }, { status: 403 });
  }
  const clinicianId = await currentClinicianId();
  if (!clinicianId) {
    return NextResponse.json({ error: "Clinician session required." }, { status: 401 });
  }
  return NextResponse.json({ enabled: getAutoAcceptPatients(clinicianId) });
}

export async function PATCH(request: NextRequest) {
  if (!(await isClinicianUser())) {
    return NextResponse.json({ error: "Clinician access required." }, { status: 403 });
  }
  const clinicianId = await currentClinicianId();
  if (!clinicianId) {
    return NextResponse.json({ error: "Clinician session required." }, { status: 401 });
  }

  const body = (await request.json()) as { enabled?: boolean };
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean." }, { status: 400 });
  }

  setAutoAcceptPatients(clinicianId, body.enabled);
  if (body.enabled) {
    await autoAssignInNetworkPatients(clinicianId);
  }

  return NextResponse.json({ enabled: body.enabled });
}
