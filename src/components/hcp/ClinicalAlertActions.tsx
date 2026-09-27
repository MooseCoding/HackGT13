"use client";

import { demoUpdateAlertStatus } from "@/lib/demo-client";
import type { ClinicalAlertStatus } from "@/lib/clinical/operations";
import { useRouter } from "next/navigation";
import { useState } from "react";

const labels: Record<ClinicalAlertStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  contacted: "Reached out",
  dismissed: "Dismissed",
};

export function ClinicalAlertActions({
  alertId,
  initialStatus,
  demo = false,
}: {
  alertId: string;
  initialStatus: ClinicalAlertStatus;
  demo?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function update(next: ClinicalAlertStatus) {
    if (saving || next === status) return;
    setSaving(true);
    setError("");
    if (demo) {
      demoUpdateAlertStatus(alertId, next);
      setStatus(next);
      setSaving(false);
      return;
    }
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
        className="min-h-9 rounded-sm border border-line bg-surface px-2 text-xs font-semibold text-ink"
      >
        {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      {saving ? <span className="text-xs text-mute" role="status">Saving…</span> : null}
      {error ? <span className="text-xs text-rose-700" role="alert">{error}</span> : null}
    </div>
  );
}
