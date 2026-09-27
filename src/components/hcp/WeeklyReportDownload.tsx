"use client";

import type { ClinicalReport } from "@/lib/clinical/reports";
import { Download, LoaderCircle, Printer } from "lucide-react";
import { useState } from "react";

/**
 * One-click weekly report download from the pre-visit brief. Uses the latest
 * saved brief, or drafts one first (Muse, with a deterministic fallback).
 */
export function WeeklyReportDownload({ memberId }: { memberId: string }) {
  const [busy, setBusy] = useState<"download" | "print" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function latestReport(): Promise<ClinicalReport> {
    const existing = await fetch(`/api/clinical/muse?memberId=${encodeURIComponent(memberId)}`);
    const listed = (await existing.json()) as { reports?: ClinicalReport[]; error?: string };
    if (!existing.ok) throw new Error(listed.error ?? "Could not load reports.");
    if (listed.reports?.[0]) return listed.reports[0];

    const drafted = await fetch("/api/clinical/muse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, tool: "draft_weekly_brief" }),
    });
    const data = (await drafted.json()) as { report?: ClinicalReport; error?: string };
    if (!drafted.ok || !data.report) throw new Error(data.error ?? "Could not draft the weekly report.");
    return data.report;
  }

  async function open(mode: "download" | "print") {
    if (busy) return;
    setBusy(mode);
    setError(null);
    // Open the print tab synchronously so pop-up blockers allow it.
    const printTab = mode === "print" ? window.open("", "_blank") : null;
    try {
      const report = await latestReport();
      const url = `/api/clinical/reports/${encodeURIComponent(report.id)}/download?memberId=${encodeURIComponent(memberId)}`;
      if (mode === "print") {
        if (printTab) printTab.location.href = `${url}&print=1`;
        else window.open(`${url}&print=1`, "_blank");
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = "";
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (cause) {
      printTab?.close();
      setError(cause instanceof Error ? cause.message : "Could not prepare the report.");
    } finally {
      setBusy(null);
    }
  }

  const button =
    "inline-flex items-center justify-center gap-2 rounded-sm border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-clinic disabled:opacity-50";

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} disabled={Boolean(busy)} onClick={() => open("download")}>
          {busy === "download" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
          Download weekly report
        </button>
        <button type="button" className={button} disabled={Boolean(busy)} onClick={() => open("print")}>
          {busy === "print" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Printer className="h-4 w-4" aria-hidden="true" />}
          PDF
        </button>
      </div>
      {error ? <p className="max-w-xs text-xs text-rose-700" role="alert">{error}</p> : null}
    </div>
  );
}
