"use client";

import type { ClinicalAlertStatus } from "@/lib/clinical/operations";
import { useRouter } from "next/navigation";
import { useState } from "react";

const labels: Record<ClinicalAlertStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  contacted: "Contacted",
  dismissed: "Dismissed",
};

export function ClinicalAlertActions({ alertId, initialStatus }: { alertId: string; initialStatus: ClinicalAlertStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function update(next: ClinicalAlertStatus) {
    if (saving || next === status) return;
    setSaving(true);
    setError("");
    const response = await fetch(`/api/clinical/alerts/${encodeURIComponent(alertId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(result.error || "Could not update this alert.");
      setSaving(false);
      return;
    }
    setStatus(next);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`alert-status-${alertId}`}>Alert review status</label>
      <select
        id={`alert-status-${alertId}`}
        value={status}
        disabled={saving}
        onChange={(event) => update(event.target.value as ClinicalAlertStatus)}
        className="min-h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700"
      >
        {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      {saving ? <span className="text-xs text-slate-400" role="status">Saving…</span> : null}
      {error ? <span className="text-xs text-rose-600" role="alert">{error}</span> : null}
    </div>
  );
}
