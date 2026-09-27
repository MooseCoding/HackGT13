import { getAuthUser, isClinicianUser } from "@/lib/auth";
import { assignmentForMember } from "@/lib/clinical/assignments";
import { clinicalPatientById } from "@/lib/clinical/operations";
import { clinicalReportsForPatient } from "@/lib/clinical/reports";
import { isDemoMode } from "@/lib/mode-server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const SUBJECT = "A Familyr report is ready for review";

function clinicianFallbackEmail() {
  return (process.env.HCP_CLINICIAN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .find(Boolean) ?? "";
}

export async function POST(request: Request) {
  try {
    const [clinician, clinicianAccess, demo] = await Promise.all([
      getAuthUser(),
      isClinicianUser(),
      isDemoMode(),
    ]);
    if (!clinicianAccess) {
      return NextResponse.json({ error: "Clinician access required." }, { status: 403 });
    }

    const body = (await request.json()) as { memberId?: string; reportId?: string; confirmed?: boolean };
    if (!body.memberId || !body.reportId || !body.confirmed) {
      return NextResponse.json({ error: "Explicit confirmation is required." }, { status: 400 });
    }

    const [patient, reports] = await Promise.all([
      clinicalPatientById(body.memberId),
      clinicalReportsForPatient(body.memberId),
    ]);
    if (!patient?.member.clinicalOptIn) {
      return NextResponse.json({ error: "This patient has not enabled clinical sharing." }, { status: 403 });
    }
    if (!reports.some((report) => report.id === body.reportId)) {
      return NextResponse.json({ error: "Report not found for this patient." }, { status: 404 });
    }

    const assignment = await assignmentForMember(body.memberId);
    const clinicianId = clinician?.id ?? (demo ? "demo-pcp" : null);
    if (!assignment || !clinicianId || assignment.clinicianId !== clinicianId) {
      return NextResponse.json({ error: "Only the assigned clinician can send this notification." }, { status: 403 });
    }

    const recipient = clinician?.email ?? clinicianFallbackEmail();
    if (!recipient) {
      return NextResponse.json({ error: "No email is configured for the assigned clinician." }, { status: 400 });
    }

    const origin = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || new URL(request.url).origin).replace(/\/$/, "");
    const reportUrl = `${origin}/hcp/patients/${encodeURIComponent(body.memberId)}`;
    const text = `A Familyr report is ready for review. Sign in to review it securely: ${reportUrl}`;
    const resendKey = process.env.RESEND_API_KEY?.trim() ?? "";
    const clinicalEmailFrom = process.env.CLINICAL_EMAIL_FROM?.trim() ?? "";
    const emailConfigured = !demo && Boolean(resendKey && clinicalEmailFrom);
    const mode: "email" | "mailto_preview" = emailConfigured ? "email" : "mailto_preview";
    const status: "sent" | "preview_ready" = mode === "email" ? "sent" : "preview_ready";
    let providerMessageId: string | null = null;
    let notificationId: string | null = null;

    if (!demo) {
      const supabase = await createSupabaseServer();
      const pending = await supabase.from("clinical_report_notifications").insert({
        report_id: body.reportId,
        member_id: body.memberId,
        clinician_id: clinicianId,
        recipient_email: recipient,
        delivery_mode: mode,
        delivery_status: "pending",
      }).select("id").single();
      if (pending.error || !pending.data) {
        throw new Error(pending.error?.message || "Could not record the notification.");
      }
      notificationId = pending.data.id;
    }

    if (mode === "email") {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: clinicalEmailFrom,
          to: [recipient],
          subject: SUBJECT,
          text,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
      if (!response.ok) throw new Error(result.message || "Email provider rejected the notification.");
      providerMessageId = result.id ?? null;
    }

    if (!demo && notificationId) {
      const supabase = await createSupabaseServer();
      const saved = await supabase.from("clinical_report_notifications").update({
        delivery_status: status,
        provider_message_id: providerMessageId,
      }).eq("id", notificationId);
      if (saved.error) throw new Error(saved.error.message);
    }

    const mailto = mode === "mailto_preview"
      ? `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(text)}`
      : undefined;
    return NextResponse.json({ ok: true, mode, status, mailto });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not notify the clinician." },
      { status: 500 },
    );
  }
}
