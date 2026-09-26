"use client";

import { GoogleSignInButton } from "@/components/home/GoogleSignInButton";
import { SignInConsent } from "@/components/home/SignInConsent";
import type { PublicSupabaseConfig } from "@/lib/supabase/public";
import { DEFAULT_FAMILY_CALL_FREQUENCY, type FamilyCallFrequency } from "@/lib/family-call-frequency";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const DEMO_SHORTCUTS = [
  { label: "Chats", href: "/family" },
  { label: "Hestia", href: "/family/digest" },
  { label: "Live signal", href: "/hcp/live" },
  { label: "Elena clinician", href: "/hcp/patients/elena" },
  { label: "Ruth", href: "/hcp/patients/ruth" },
] as const;

/**
 * Homepage for judges and new families. Preserve Google sign-in, demo entry,
 * data-home hooks, and a11y landmarks — see `./REDESIGN.md`.
 */
export function LandingPage({
  next,
  authError,
  signedIn,
  needsOnboarding,
  needsTermsAcceptance,
  supabaseConfig,
}: {
  next: string;
  authError: boolean;
  signedIn: boolean;
  needsOnboarding: boolean;
  needsTermsAcceptance: boolean;
  supabaseConfig: PublicSupabaseConfig | null;
}) {
  const [demoBusy, setDemoBusy] = useState(false);
  const [jumpBusy, setJumpBusy] = useState<string | null>(null);
  const [generalConsent, setGeneralConsent] = useState(false);
  const [healthcareConsent, setHealthcareConsent] = useState(false);
  const [familyCallFrequency, setFamilyCallFrequency] = useState<FamilyCallFrequency>(DEFAULT_FAMILY_CALL_FREQUENCY);
  const [consentBusy, setConsentBusy] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const router = useRouter();

  async function enableDemo() {
    await fetch("/api/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demo: true }),
    });
  }

  async function openDemo(destination = "/family") {
    setDemoBusy(true);
    await enableDemo();
    router.push(destination);
    router.refresh();
  }

  async function jumpToDemo(href: string) {
    setJumpBusy(href);
    await enableDemo();
    router.push(href);
    router.refresh();
  }

  async function continueSignedIn() {
    setConsentBusy(true);
    setConsentError(null);
    const res = await fetch("/api/consent/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        termsAccepted: true,
        healthcareConsent,
        familyCallFrequency,
      }),
    });
    setConsentBusy(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setConsentError(json.error || "Could not save your consent choices.");
      return;
    }
    router.push(needsOnboarding ? "/onboarding" : "/family");
    router.refresh();
  }

  const showConsent = !signedIn || needsTermsAcceptance;
  const canContinue = generalConsent && !consentBusy;

  return (
    <div className="chat-surface flex min-h-full flex-col">
      <header data-home="header" className="px-4 pt-4 sm:px-6">
        <div className="glass mx-auto flex max-w-3xl items-center justify-between gap-4 rounded-2xl px-4 py-3 sm:px-6">
          <p className="font-brand text-xl text-ink">Hearth</p>
          {signedIn ? (
            <Link
              href={needsOnboarding ? "/onboarding" : "/family"}
              className="big inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-ember px-3.5 text-sm font-semibold text-white hover:bg-ember-dark active:bg-ember-dark"
            >
              {needsOnboarding ? "Finish setup" : "Open Hearth"}
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
                className="shrink-0"
              >
                <path
                  d="M2.25 7h9.5M8.25 3.5 11.75 7l-3.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                />
              </svg>
            </Link>
          ) : null}
        </div>
      </header>

      <main
        id="main-content"
        data-home="hero"
        className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14"
      >
        <p className="font-brand text-sm text-ember">Family, in one place</p>
        <h1 className="font-brand mt-3 max-w-xl text-4xl leading-[1.12] tracking-tight text-ink sm:text-[2.75rem]">
          Come home to the story, not the group chat.
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-7 text-mute sm:text-xl sm:leading-8">
          Group chats burn people out — especially the family members who need them most. Hearth gives you
          async chat, a shared calendar, and Hestia, your weekly story.
        </p>

        <p className="mt-8 text-sm font-medium text-ink" aria-label="What Hearth includes">
          <span>async chat</span>
          <span className="mx-2 text-mute" aria-hidden="true">·</span>
          <span>weekly story</span>
          <span className="mx-2 text-mute" aria-hidden="true">·</span>
          <span>opt-in clinician view</span>
        </p>

        <section
          data-home="sign-in"
          aria-labelledby="sign-in-heading"
          className="glass mt-8 max-w-md rounded-2xl p-5"
        >
          <h2 id="sign-in-heading" className="text-lg font-semibold text-ink">
            {signedIn ? "You’re signed in" : "Start your own circle"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-mute">
            {signedIn
              ? needsTermsAcceptance
                ? "Review and accept the consent choices below to continue."
                : needsOnboarding
                  ? "Add your family next. It only takes a minute."
                  : "Your circle is ready."
              : "Review the consent choices below, then sign in with Google. Calendar access is separate and optional."}
          </p>
          {showConsent ? (
            <SignInConsent
              generalAccepted={generalConsent}
              healthcareAccepted={healthcareConsent}
              familyCallFrequency={familyCallFrequency}
              onGeneralChange={setGeneralConsent}
              onHealthcareChange={setHealthcareConsent}
              onFamilyCallFrequencyChange={setFamilyCallFrequency}
            />
          ) : null}
          {authError ? (
            <p className="mt-3 text-sm text-ember" role="alert">
              Sign-in did not finish. Try again.
            </p>
          ) : null}
          <div className="mt-5">
            {signedIn ? (
              needsTermsAcceptance ? (
                <button
                  type="button"
                  onClick={continueSignedIn}
                  disabled={!canContinue}
                  className="flex min-h-12 w-full items-center justify-center rounded-xl bg-ember px-4 text-base font-semibold text-white hover:bg-ember-dark disabled:opacity-60"
                >
                  {consentBusy ? "Saving…" : "Continue"}
                </button>
              ) : (
                <Link
                  href={needsOnboarding ? "/onboarding" : "/family"}
                  className="flex min-h-12 items-center justify-center rounded-xl bg-ember px-4 text-base font-semibold text-white hover:bg-ember-dark"
                >
                  {needsOnboarding ? "Add your family" : "Open your circle"}
                </Link>
              )
            ) : (
              <GoogleSignInButton
                next={next}
                supabaseConfig={supabaseConfig}
                disabled={!generalConsent}
                healthcareConsent={healthcareConsent}
                familyCallFrequency={familyCallFrequency}
                variant="primary"
              />
            )}
          </div>
          {consentError ? (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {consentError}
            </p>
          ) : null}
        </section>

        <section data-home="demo" className="mt-8 max-w-md" aria-labelledby="demo-heading">
          <h2 id="demo-heading" className="text-sm font-medium text-mute">
            Or preview a sample family
          </h2>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => openDemo("/family")}
              disabled={demoBusy || Boolean(jumpBusy)}
              className="glass flex min-h-11 flex-1 items-center justify-center rounded-xl px-4 text-sm font-medium text-ink hover:border-ember disabled:opacity-60"
            >
              {demoBusy ? "Opening sample…" : "Open sample family"}
            </button>
            <button
              type="button"
              onClick={() => openDemo("/hcp/live")}
              disabled={demoBusy || Boolean(jumpBusy)}
              className="glass flex min-h-11 flex-1 items-center justify-center rounded-xl px-4 text-sm font-medium text-ink hover:border-ember disabled:opacity-60"
            >
              {demoBusy ? "Opening…" : "Run live signal demo"}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-mute">
            Alvarez and Okonkwo circles. No Google sign-in needed.
          </p>
        </section>

        <nav className="mt-4 max-w-xl" aria-label="Demo shortcuts">
          <p className="text-xs text-mute">Jump to a demo screen</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {DEMO_SHORTCUTS.map((item) => (
              <li key={item.href}>
                <button
                  type="button"
                  onClick={() => jumpToDemo(item.href)}
                  disabled={Boolean(demoBusy || jumpBusy)}
                  className="glass min-h-11 rounded-xl px-2.5 py-1.5 text-xs font-medium text-ink hover:border-ember disabled:opacity-60"
                >
                  {jumpBusy === item.href ? "Opening…" : item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </main>

      <footer data-home="footer" className="border-t border-line px-4 py-6 sm:px-6">
        <p className="mx-auto max-w-3xl text-sm leading-6 text-mute">
          Clinician insights show up only when someone in the family turns sharing on.
        </p>
        <p className="mx-auto mt-3 max-w-3xl text-sm">
          <Link href="/privacy" className="font-medium text-clinic underline-offset-4 hover:underline">
            Privacy &amp; your data
          </Link>
        </p>
        <p className="mx-auto mt-2 max-w-3xl text-xs text-mute">Built at HackGT 13</p>
      </footer>
    </div>
  );
}
