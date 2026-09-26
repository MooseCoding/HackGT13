"use client";

import { demoSetAutoAcceptPatients } from "@/lib/demo-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AutoAcceptPatientsToggle({
  initialEnabled,
  demo = false,
}: {
  initialEnabled: boolean;
  demo?: boolean;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle(next: boolean) {
    if (busy) return;
    setBusy(true);
    setError("");
    if (demo) {
      demoSetAutoAcceptPatients(next);
      setEnabled(next);
      setBusy(false);
      return;
    }
    const response = await fetch("/api/clinical/auto-assign", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(result.error || "Could not update auto-accept.");
      return;
    }
    setEnabled(next);
    router.refresh();
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      <label className="flex min-h-11 cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={enabled}
          disabled={busy}
          onChange={(event) => toggle(event.target.checked)}
          className="mt-1 shrink-0"
        />
        <span className="text-sm leading-6 text-ink">
          <span className="font-semibold">Auto-accept in-network patients</span>
          <span className="mt-1 block text-mute">
            When this is on, matching patients land on your roster without you adding them one by one.
          </span>
        </span>
      </label>
      {error ? (
        <p className="mt-2 text-xs text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
