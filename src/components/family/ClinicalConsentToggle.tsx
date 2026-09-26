"use client";

import type { Member } from "@/lib/types";
import { useState } from "react";

export function ClinicalConsentToggle({ member }: { member: Member }) {
  const [enabled, setEnabled] = useState(member.clinicalOptIn);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function change(next: boolean) {
    setSaving(true);
    setError("");
    const response = await fetch("/api/consent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: member.id, enabled: next }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(result.error || "Could not update sharing.");
      setSaving(false);
      return;
    }
    setEnabled(next);
    setSaving(false);
  }

  return (
    <div className="relative">
      <label className="flex min-h-11 items-center gap-1.5 text-sm text-mute" title="Share derived communication trends with the clinical review dashboard">
        <input type="checkbox" checked={enabled} disabled={saving} onChange={(event) => change(event.target.checked)} />
        Care insights
      </label>
      {error ? <span className="absolute right-0 top-full z-20 w-48 rounded bg-red-50 p-2 text-xs text-red-700" role="alert">{error}</span> : null}
    </div>
  );
}
