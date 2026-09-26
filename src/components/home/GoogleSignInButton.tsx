"use client";

import { writePendingConsent } from "@/lib/consent";
import { type FamilyCallFrequency } from "@/lib/family-call-frequency";
import { createSupabaseBrowser } from "@/lib/supabase/browser";
import type { PublicSupabaseConfig } from "@/lib/supabase/public";
import { useState } from "react";

export function GoogleSignInButton({
  next = "/onboarding",
  supabaseConfig,
  disabled = false,
  healthcareConsent = false,
  familyCallFrequency = "weekly",
  storePendingConsent = false,
  authFlow = "login",
  label = "Continue with Google",
  variant = "secondary",
}: {
  next?: string;
  supabaseConfig: PublicSupabaseConfig | null;
  disabled?: boolean;
  healthcareConsent?: boolean;
  familyCallFrequency?: FamilyCallFrequency;
  storePendingConsent?: boolean;
  authFlow?: "login" | "signup";
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setError(null);
    try {
      if (!supabaseConfig) {
        throw new Error("Sign-in did not finish. Try again.");
      }
      if (storePendingConsent) {
        writePendingConsent({ healthcare: healthcareConsent, familyCallFrequency });
      }
      const supabase = createSupabaseBrowser(supabaseConfig);
      await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demo: false }),
      });
      const origin = window.location.origin;
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}&flow=${authFlow}`,
          scopes: "https://www.googleapis.com/auth/calendar",
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (authError) {
        setError("Sign-in did not finish. Try again.");
        setBusy(false);
      }
    } catch {
      setError("Sign-in did not finish. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={signIn}
        disabled={busy || !supabaseConfig || disabled}
        className={
          variant === "primary"
            ? "flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-ember px-4 text-base font-semibold text-white hover:bg-ember-dark disabled:opacity-60"
            : "flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-line bg-paper/80 px-4 text-base font-semibold text-ink hover:border-ember disabled:opacity-60"
        }
      >
        <GoogleMark />
        {busy ? "Opening Google…" : label}
      </button>
      {!supabaseConfig ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          Sign-in did not finish. Try again.
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91A8.78 8.78 0 0 0 17.64 9.2Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.35 0-4.34-1.58-5.05-3.71H.91v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.71A5.41 5.41 0 0 1 3.66 9c0-.6.1-1.17.29-1.71V4.96H.91A9 9 0 0 0 0 9c0 1.45.35 2.82.91 4.04l3.04-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .91 4.96L3.95 7.3C4.66 5.16 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}
