import { getAuthUser } from "../auth";
import { isDemoMode } from "../mode-server";
import { createSupabaseServer } from "../supabase/server";
import { createSupabaseAdmin } from "../supabase/admin";

export type ClinicalReportStatus = "draft" | "reviewed" | "signed";

export type ClinicalReport = {
  id: string;
  snapshotId: string;
  memberId: string;
  familyId: string;
  brief: string;
  findings: string[];
  recommendedNextStep: string;
  evidenceIds: string[];
  modelProvider: "muse" | "grok" | "local";
  modelName: string;
  promptVersion: string;
  status: ClinicalReportStatus;
  generatedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
};

const globalReports = globalThis as typeof globalThis & { __hearthClinicalReports?: ClinicalReport[] };

function demoReports() {
  if (!globalReports.__hearthClinicalReports) globalReports.__hearthClinicalReports = [];
  return globalReports.__hearthClinicalReports;
}

function mapReport(row: Record<string, unknown>): ClinicalReport {
  return {
    id: String(row.id),
    snapshotId: String(row.snapshot_id),
    memberId: String(row.member_id),
    familyId: String(row.family_id),
    brief: String(row.brief),
    findings: Array.isArray(row.findings) ? row.findings.map(String) : [],
    recommendedNextStep: String(row.recommended_next_step),
    evidenceIds: Array.isArray(row.evidence_ids) ? row.evidence_ids.map(String) : [],
    modelProvider: row.model_provider as ClinicalReport["modelProvider"],
    modelName: String(row.model_name),
    promptVersion: String(row.prompt_version),
    status: row.status as ClinicalReportStatus,
    generatedAt: String(row.generated_at),
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
  };
}

export async function saveClinicalReport(
  report: Omit<ClinicalReport, "id">,
  options?: { system?: boolean },
): Promise<ClinicalReport> {
  if (await isDemoMode()) {
    const existing = demoReports().find(
      (row) => row.snapshotId === report.snapshotId && row.promptVersion === report.promptVersion,
    );
    if (existing) return existing;
    const saved = { ...report, id: `report-${Date.now()}` };
    demoReports().unshift(saved);
    return saved;
  }
  const supabase = options?.system ? createSupabaseAdmin() : await createSupabaseServer();
  const existing = await supabase
    .from("clinical_reports")
    .select("*")
    .eq("snapshot_id", report.snapshotId)
    .eq("prompt_version", report.promptVersion)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return mapReport(existing.data);
  const result = await supabase.from("clinical_reports").insert({
    snapshot_id: report.snapshotId,
    member_id: report.memberId,
    family_id: report.familyId,
    brief: report.brief,
    findings: report.findings,
    recommended_next_step: report.recommendedNextStep,
    evidence_ids: report.evidenceIds,
    model_provider: report.modelProvider,
    model_name: report.modelName,
    prompt_version: report.promptVersion,
    status: report.status,
    generated_at: report.generatedAt,
  }).select("*").single();
  if (result.error || !result.data) throw new Error(result.error?.message || "Could not save clinical report.");
  return mapReport(result.data);
}

export async function clinicalReportsForPatient(memberId: string): Promise<ClinicalReport[]> {
  if (await isDemoMode()) return demoReports().filter((report) => report.memberId === memberId);
  const supabase = await createSupabaseServer();
  const result = await supabase
    .from("clinical_reports")
    .select("*")
    .eq("member_id", memberId)
    .order("generated_at", { ascending: false });
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []).map((row) => mapReport(row));
}

export async function reviewClinicalReport(id: string, memberId: string): Promise<ClinicalReport | null> {
  const reviewedAt = new Date().toISOString();
  const user = await getAuthUser();
  if (await isDemoMode()) {
    const index = demoReports().findIndex((report) => report.id === id && report.memberId === memberId);
    if (index < 0) return null;
    demoReports()[index] = {
      ...demoReports()[index],
      status: "reviewed",
      reviewedAt,
      reviewedBy: user?.id ?? "demo-pcp",
    };
    return demoReports()[index];
  }
  const supabase = await createSupabaseServer();
  const result = await supabase.from("clinical_reports").update({
    status: "reviewed",
    reviewed_at: reviewedAt,
    reviewed_by: user?.id ?? null,
  }).eq("id", id).eq("member_id", memberId).select("*").maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? mapReport(result.data) : null;
}
