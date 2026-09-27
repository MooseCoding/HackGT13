import { getAuthUser, isClinicianUser } from "@/lib/auth";
import type { ClinicalAlertStatus } from "@/lib/clinical/operations";
import { isDemoMode } from "@/lib/mode-server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const STATUSES = new Set<ClinicalAlertStatus>(["new", "reviewing", "contacted", "dismissed"]);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isClinicianUser())) {
    return NextResponse.json({ error: "Clinician access required." }, { status: 403 });
  }
  const body = (await request.json()) as { status?: ClinicalAlertStatus };
  if (!body.status || !STATUSES.has(body.status)) {
    return NextResponse.json({ error: "A valid review status is required." }, { status: 400 });
  }
  const { id } = await params;
  if (await isDemoMode()) {
    return NextResponse.json({ alert: { id, status: body.status }, demo: true });
  }
  const user = await getAuthUser();
  const supabase = await createSupabaseServer();
  const now = new Date().toISOString();
  const result = await supabase
    .from("clinical_alerts")
    .update({
      status: body.status,
      assigned_to: body.status === "new" ? null : user?.id ?? null,
      reviewed_at: body.status === "new" ? null : now,
      updated_at: now,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
  return NextResponse.json({ alert: result.data });
}
