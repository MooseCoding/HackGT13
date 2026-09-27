"use client";

import { clearPendingConsent, readPendingConsent } from "@/lib/consent";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function AuthCompleteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/family";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function finish() {
      const pending = readPendingConsent();
      if (pending) {
        const res = await fetch("/api/consent/account", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            termsAccepted: true,
            healthcareConsent: pending.healthcare,
            familyCallFrequency: pending.familyCallFrequency,
          }),
        });
        clearPendingConsent();
        if (!res.ok && !cancelled) {
          const json = await res.json().catch(() => ({}));
          setError(json.error || "Could not save your consent choices.");
          return;
        }
      }
      if (!cancelled) {
        router.replace(next.startsWith("/") ? next : "/family");
        router.refresh();
      }
    }
    void finish();
    return () => {
      cancelled = true;
    };
  }, [next, router]);

  if (error) {
    return (
      <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16">
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
        <Link href="/" className="mt-4 text-sm font-medium text-ember hover:underline">
          Back to home
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16">
      <p className="text-sm text-mute">Finishing sign-in…</p>
    </main>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16">
          <p className="text-sm text-mute">Finishing sign-in…</p>
        </main>
      }
    >
      <AuthCompleteInner />
    </Suspense>
  );
}
