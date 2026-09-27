"use client";

import { FamilyrLogo } from "@/components/FamilyrLogo";
import { GoogleSignInButton } from "@/components/home/GoogleSignInButton";
import { SignInConsent } from "@/components/home/SignInConsent";
import { clearPendingConsent, readPendingConsent } from "@/lib/consent";
import type { PublicSupabaseConfig } from "@/lib/supabase/public";
import { DEFAULT_FAMILY_CALL_FREQUENCY, type FamilyCallFrequency } from "@/lib/family-call-frequency";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function SignupPage({
  next,
  authError,
  signedIn,
  needsOnboarding,
  supabaseConfig,
}: {
  next: string;
  authError: boolean;
  signedIn: boolean;
  needsOnboarding: boolean;
  supabaseConfig: PublicSupabaseConfig | null;
}) {
  const [generalConsent, setGeneralConsent] = useState(false);
  const [healthcareConsent, setHealthcareConsent] = useState(false);
  const [familyCallFrequency, setFamilyCallFrequency] = useState<FamilyCallFrequency>(DEFAULT_FAMILY_CALL_FREQUENCY);
  const [consentBusy, setConsentBusy] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [applyingPending, setApplyingPending] = useState(false);
  const appliedPending = useRef(false);
  const router = useRouter();

  async function saveConsent(input: {
    healthcareConsent: boolean;
    familyCallFrequency: FamilyCallFrequency;
  }) {
    setConsentBusy(true);
    setConsentError(null);
    const res = await fetch("/api/consent/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        termsAccepted: true,
        healthcareConsent: input.healthcareConsent,
        familyCallFrequency: input.familyCallFrequency,
      }),
    });
    setConsentBusy(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setConsentError(json.error || "Could not save your consent choices.");
      return false;
    }
    clearPendingConsent();
    return true;
  }

  useEffect(() => {
    if (!signedIn || appliedPending.current) return;
    const pending = readPendingConsent();
    if (!pending) return;

    appliedPending.current = true;
    setApplyingPending(true);
    setHealthcareConsent(pending.healthcare);
    setFamilyCallFrequency(pending.familyCallFrequency);
    setGeneralConsent(true);

    let cancelled = false;
    async function applyPending() {
      const saved = await saveConsent({
        healthcareConsent: pending!.healthcare,
        familyCallFrequency: pending!.familyCallFrequency,
      });
      if (cancelled) return;
      setApplyingPending(false);
      if (!saved) return;
      router.replace(needsOnboarding ? "/onboarding" : next);
      router.refresh();
    }

    applyPending();
    return () => {
      cancelled = true;
    };
  }, [signedIn, needsOnboarding, next, router]);

  async function continueSignedIn() {
    const saved = await saveConsent({ healthcareConsent, familyCallFrequency });
    if (!saved) return;
    router.push(needsOnboarding ? "/onboarding" : next);
    router.refresh();
  }

  const canContinue = generalConsent && !consentBusy;

  if (applyingPending) {
    return (
      <div className="flex min-h-full flex-col bg-ground">
        <main id="main-content" className="mx-auto w-full max-w-md flex-1 px-4 py-16 text-center">
          <p className="text-lg font-semibold text-ink">Saving your choices…</p>
          <p className="mt-2 text-sm text-mute">Hang on, wrapping up sign-up.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-ground">
      <header className="border-b border-line bg-surface px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-md items-center justify-between gap-4">
          <FamilyrLogo />
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-2xl font-bold text-ink">Sign up</h1>
        <p className="mt-2 text-sm leading-6 text-mute">
          {signedIn
            ? "Check the boxes below so we can finish setting up your account."
            : "Read the boxes below, then sign up with Google. Calendar is optional and separate."}
        </p>

        <section className="mt-8 border border-line bg-surface p-5">
          <SignInConsent
            generalAccepted={generalConsent}
            healthcareAccepted={healthcareConsent}
            familyCallFrequency={familyCallFrequency}
            onGeneralChange={setGeneralConsent}
            onHealthcareChange={setHealthcareConsent}
            onFamilyCallFrequencyChange={setFamilyCallFrequency}
          />
          {authError ? (
            <p className="mt-3 text-sm text-ember" role="alert">
              Sign-up did not finish. Try again.
            </p>
          ) : null}
          <div className="mt-5">
            {signedIn ? (
              <button
                type="button"
                onClick={continueSignedIn}
                disabled={!canContinue}
                className="flex min-h-12 w-full items-center justify-center rounded-sm bg-ember px-4 text-base font-semibold text-white hover:bg-ember-dark disabled:opacity-60"
              >
                {consentBusy ? "Saving…" : "Continue"}
              </button>
            ) : (
              <GoogleSignInButton
                next={next}
                supabaseConfig={supabaseConfig}
                disabled={!generalConsent}
                healthcareConsent={healthcareConsent}
                familyCallFrequency={familyCallFrequency}
                storePendingConsent
                authFlow="signup"
                variant="primary"
                label="Sign up with Google"
              />
            )}
          </div>
          {consentError ? (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {consentError}
            </p>
          ) : null}
        </section>

        <p className="mt-6 text-sm text-mute">
          Already have an account?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-clinic underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
