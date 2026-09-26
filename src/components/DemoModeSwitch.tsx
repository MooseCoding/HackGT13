"use client";

import { useState } from "react";

export function DemoModeSwitch({
  demo,
  canGoLive,
  compact = false,
}: {
  demo: boolean;
  canGoLive: boolean;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function setDemo(next: boolean) {
    if (busy) return;
    if (!next && !canGoLive) return;
    setBusy(true);
    await fetch("/api/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demo: next }),
    });
    window.location.reload();
  }

  if (compact) {
    return (
      <label className="flex items-center gap-1.5 text-sm text-mute">
        <input
          type="checkbox"
          checked={demo}
          disabled={busy || (!demo && !canGoLive)}
          onChange={(e) => setDemo(e.target.checked)}
        />
        Sample family
      </label>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className={demo ? "font-medium text-ink" : "text-mute"}>
        {demo ? "Demo mode (mock data)" : "Live (Supabase)"}
      </span>
      {canGoLive ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => setDemo(!demo)}
          className="border border-line px-2 py-1 text-xs hover:underline"
        >
          {demo ? "Use Supabase" : "Use mock data"}
        </button>
      ) : (
        <span className="text-xs text-mute">Add Supabase keys to leave demo mode</span>
      )}
    </div>
  );
}

export function DemoBanner({ demo, canGoLive }: { demo: boolean; canGoLive: boolean }) {
  return (
    <div className={`border-b border-line px-4 py-1.5 ${demo ? "bg-accent-tint" : ""}`}>
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
        <p className="text-xs text-mute">
          {demo
            ? "Sample mode uses the Alvarez and Okonkwo mock families."
            : "Live mode reads and writes your Supabase project."}
        </p>
        <DemoModeSwitch demo={demo} canGoLive={canGoLive} compact />
      </div>
    </div>
  );
}
