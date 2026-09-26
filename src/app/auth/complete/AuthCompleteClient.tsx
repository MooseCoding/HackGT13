"use client";

import { clearPendingConsent, readPendingConsent } from "@/lib/consent";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function AuthCompleteClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const pending = readPendingConsent();
      const next = searchParams.get("next");
      const destination = next && next.startsWith("/") ? next : "/onboarding";

      if (!pending) {
        router.replace(destination);
        router.refresh();
        return;
      }

      const res = await fetch("/api/consent/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          termsAccepted: true,
          healthcareConsent: pending.healthcare,
          familyCallFrequency: pending.familyCallFrequency,
        }),
      });

      clearPendingConsent();

      if (cancelled) return;

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Could not save your consent choices. Try again from the sign-in page.");
        return;
      }

      router.replace(destination);
      router.refresh();
    }

    finish();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-lg font-semibold text-ink">Saving your choices…</p>
      <p className="mt-2 text-sm text-mute">One moment while we finish sign-in.</p>
      {error ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
