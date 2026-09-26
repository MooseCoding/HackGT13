"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const WARNINGS = [
  "Authorized care-team accounts can see posting patterns tied to your profile — timing, word variety, repetition — not raw message text by default.",
  "Signals are decision support only. They are not a diagnosis and Familyr is not a medical device.",
  "Family messages stay in your circle unless you turn this on. Revoking consent removes your profile from the clinician portal.",
] as const;

export function ClinicalSharingSettings({
  memberId,
  initialEnabled,
}: {
  memberId: string;
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(initialEnabled);
    setAcknowledged(false);
  }, [initialEnabled, memberId]);

  async function updateConsent(next: boolean) {
    if (!memberId || busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/consent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, enabled: next }),
    });
    setBusy(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || "Could not update sharing.");
      return;
    }
    setEnabled(next);
    setAcknowledged(false);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/family"
        className="inline-flex min-h-11 items-center text-sm font-medium text-clinic underline-offset-4 hover:underline"
      >
        Back to family
      </Link>

      <header className="mt-4 border-b border-line pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mute">Settings</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Clinician sharing</h1>
        <p className="mt-3 max-w-xl text-base leading-7 text-mute">
          Off by default. Turning this on exposes activity patterns from your profile to authorized care-team
          accounts in the clinician view.
        </p>
      </header>

      <section className="mt-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4" aria-labelledby="clinical-warning-heading">
        <h2 id="clinical-warning-heading" className="text-sm font-semibold text-amber-950">
          Before you turn this on
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-amber-950/90">
          {WARNINGS.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-6 text-amber-950/80">
          Read more in{" "}
          <Link href="/privacy" className="font-medium text-clinic underline-offset-4 hover:underline">
            Privacy &amp; data practices
          </Link>
          .
        </p>
      </section>

      <section className="mt-8 rounded-xl border border-rule bg-surface px-4 py-5 shadow-sm shadow-black/[0.03]" aria-labelledby="clinical-status-heading">
        <h2 id="clinical-status-heading" className="text-sm font-semibold text-ink">Your profile</h2>
        <p className="mt-2 text-sm text-mute">
          Clinician sharing is{" "}
          <span className="font-medium text-ink">{enabled ? "on" : "off"}</span> for your member profile.
        </p>

        {error ? (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        {enabled ? (
          <div className="mt-5 space-y-3">
            <p className="text-sm leading-6 text-mute">
              Your profile appears in the clinician portal while sharing is on. Turn it off anytime to drop out of
              that view.
            </p>
            <button
              type="button"
              onClick={() => updateConsent(false)}
              disabled={busy}
              className="min-h-11 w-full rounded-lg border border-rule px-4 text-sm font-medium text-ink transition-colors hover:border-ink/25 hover:bg-accent-tint disabled:opacity-60 sm:w-auto"
            >
              {busy ? "Saving…" : "Turn off clinician sharing"}
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <label className="flex min-h-11 items-start gap-3 text-sm leading-6 text-ink">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-1 shrink-0"
              />
              <span>
                I understand that clinician sharing exposes activity patterns from my profile to authorized
                care-team accounts. This is optional, not a diagnosis, and I can turn it off later.
              </span>
            </label>
            <button
              type="button"
              onClick={() => updateConsent(true)}
              disabled={busy || !acknowledged}
              className="min-h-11 w-full rounded-lg bg-ember px-4 text-sm font-semibold text-white transition-colors hover:bg-ember/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {busy ? "Saving…" : "Turn on clinician sharing"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
