"use client";

import type { ClinicalMuseTool } from "@/lib/clinical/muse-tools";
import type { ClinicalReport } from "@/lib/clinical/reports";
import { CheckCircle2, Download, LoaderCircle, Mail, Printer } from "lucide-react";
import { useEffect, useState } from "react";

const TOOLS: Array<{ id: ClinicalMuseTool; label: string; detail: string }> = [
  { id: "read_snapshot", label: "Read snapshot", detail: "Risk, confidence, samples, and flags" },
  { id: "compare_baseline", label: "Compare baseline", detail: "Current window versus personal baseline" },
  { id: "read_evidence", label: "Read evidence IDs", detail: "Timestamps and tags; message text withheld" },
  { id: "draft_weekly_brief", label: "Draft weekly brief", detail: "Muse summary grounded in the snapshot" },
];

export function ClinicalMusePanel({ memberId, patientName }: { memberId: string; patientName: string }) {
  const [busy, setBusy] = useState<ClinicalMuseTool | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [report, setReport] = useState<ClinicalReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [confirmNotify, setConfirmNotify] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/clinical/muse?memberId=${encodeURIComponent(memberId)}`)
      .then(async (response) => {
        const data = (await response.json()) as { reports?: ClinicalReport[] };
        if (!cancelled && response.ok) setReport(data.reports?.[0] ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  async function run(tool: ClinicalMuseTool) {
    if (busy) return;
    setBusy(tool);
    setError(null);
    try {
      const response = await fetch("/api/clinical/muse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, tool }),
      });
      const data = (await response.json()) as {
        result?: Record<string, unknown>;
        report?: ClinicalReport;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Muse tool failed.");
      setResult(data.result ?? null);
      setReport(data.report ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Muse tool failed.");
    } finally {
      setBusy(null);
    }
  }

  async function markReviewed() {
    if (!report || reviewing) return;
    setReviewing(true);
    setError(null);
    try {
      const response = await fetch("/api/clinical/muse", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: report.id, memberId, confirmed: true }),
      });
      const data = (await response.json()) as { report?: ClinicalReport; error?: string };
      if (!response.ok || !data.report) throw new Error(data.error ?? "Could not mark reviewed.");
      setReport(data.report);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not mark reviewed.");
    } finally {
      setReviewing(false);
    }
  }

  async function notifyClinician() {
    if (!report || notifying) return;
    setNotifying(true);
    setError(null);
    try {
      const response = await fetch("/api/clinical/notify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: report.id, memberId, confirmed: true }),
      });
      const data = (await response.json()) as {
        mode?: "email" | "mailto_preview";
        mailto?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Could not notify the clinician.");
      setConfirmNotify(false);
      if (data.mode === "mailto_preview" && data.mailto) {
        setNotificationStatus("Email preview prepared — delivery is not automatic.");
        window.location.assign(data.mailto);
      } else {
        setNotificationStatus("Clinician notification sent and recorded.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not notify the clinician.");
    } finally {
      setNotifying(false);
    }
  }

  return (
    <section className="mt-5 border border-line bg-surface p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-clinic">Muse · clinician mode</p>
          <h2 className="mt-1 text-lg font-bold text-ink">Permissioned clinical tools</h2>
          <p className="mt-1 max-w-2xl text-sm text-mute">
            Muse can read {patientName}&apos;s authorized snapshot and draft a screening brief. It cannot diagnose,
            submit a chart note, or contact the patient. Clinician notifications require explicit confirmation.
          </p>
        </div>
        <span className="rounded-sm border border-line bg-ground px-2 py-1 text-xs font-semibold text-mute">
          4 tools enabled
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            disabled={Boolean(busy)}
            onClick={() => run(tool.id)}
            className="border border-line bg-ground p-3 text-left hover:border-clinic disabled:opacity-50"
          >
            <span className="block text-sm font-semibold text-ink">
              {busy === tool.id ? "Running…" : tool.label}
            </span>
            <span className="mt-1 block text-xs leading-5 text-mute">{tool.detail}</span>
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p> : null}

      {result ? (
        <div className="mt-4 border border-line bg-ground p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-mute">Tool result</p>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs leading-5 text-ink">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      ) : null}

      {report ? (
        <div className="mt-4 border border-clinic/30 bg-ground p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-ink">Weekly screening brief</p>
            <span className="rounded-sm border border-line bg-surface px-2 py-1 text-[11px] font-semibold uppercase text-mute">
              {report.status}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-ink">{report.brief}</p>
          <ul className="mt-3 space-y-1 text-sm text-ink">
            {report.findings.map((finding) => <li key={finding}>• {finding}</li>)}
          </ul>
          <p className="mt-3 text-sm"><span className="font-semibold">Next step:</span> {report.recommendedNextStep}</p>
          <p className="mt-3 text-xs text-mute">
            {report.modelProvider} · {report.modelName} · {report.promptVersion} · {report.evidenceIds.length} evidence IDs
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={`/api/clinical/reports/${encodeURIComponent(report.id)}/download?memberId=${encodeURIComponent(memberId)}`}
              download
              className="inline-flex items-center gap-2 rounded-sm border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-clinic"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download report
            </a>
            <a
              href={`/api/clinical/reports/${encodeURIComponent(report.id)}/download?memberId=${encodeURIComponent(memberId)}&print=1`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 rounded-sm border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-clinic"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              Print or save as PDF
            </a>
          </div>
          {report.status === "draft" ? (
            <p className="mt-2 text-xs text-mute">Downloads of a draft are marked “not yet reviewed”.</p>
          ) : null}
          {report.status === "draft" ? (
            <button
              type="button"
              disabled={reviewing}
              onClick={markReviewed}
              className="mt-4 rounded-sm bg-clinic px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {reviewing ? "Saving…" : "Confirm and mark reviewed"}
            </button>
          ) : (
            <p className="mt-4 text-sm font-semibold text-clinic">Clinician reviewed ✓</p>
          )}
          <div className="mt-4 border-t border-line pt-4">
            {confirmNotify ? (
              <div className="notification-enter rounded-sm border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                <p className="font-semibold">Send a secure report link?</p>
                <p className="mt-1 text-xs leading-5 text-amber-900">
                  The email uses a neutral subject and contains no patient findings. The send or preview will be recorded.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={notifying}
                    onClick={notifyClinician}
                    className="inline-flex items-center gap-2 rounded-sm bg-clinic px-3 py-2 font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    {notifying ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />}
                    Confirm notification
                  </button>
                  <button
                    type="button"
                    disabled={notifying}
                    onClick={() => setConfirmNotify(false)}
                    className="rounded-sm border border-line bg-surface px-3 py-2 font-semibold text-mute hover:text-ink disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmNotify(true)}
                className="inline-flex items-center gap-2 rounded-sm border border-clinic/40 bg-surface px-3 py-2 text-sm font-semibold text-clinic transition hover:-translate-y-0.5 hover:bg-accent-tint"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Notify clinician
              </button>
            )}
            {notificationStatus ? (
              <p className="mt-3 flex items-center gap-2 text-sm font-medium text-clinic" role="status">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {notificationStatus}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
