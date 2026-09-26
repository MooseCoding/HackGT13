"use client";

import { HearthMark } from "@/components/HearthMark";
import { GoogleSignInButton } from "@/components/home/GoogleSignInButton";
import type { PublicSupabaseConfig } from "@/lib/supabase/public";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const TRUST_POINTS = [
  {
    title: "Opt-in only",
    body: "Patients appear after a family member turns clinician sharing on.",
  },
  {
    title: "Patterns, not raw chat",
    body: "You see activity signals and source posts — never the full group thread by default.",
  },
  {
    title: "Personal baselines",
    body: "Changes are measured against each person's own history, not a generic norm.",
  },
] as const;

export function ClinicianLoginPage({
  next,
  authError,
  accessDenied,
  signedInEmail,
  supabaseConfig,
}: {
  next: string;
  authError: boolean;
  accessDenied: boolean;
  signedInEmail: string | null;
  supabaseConfig: PublicSupabaseConfig | null;
}) {
  const [demoBusy, setDemoBusy] = useState(false);
  const [signOutBusy, setSignOutBusy] = useState(false);
  const router = useRouter();

  async function openDemo() {
    setDemoBusy(true);
    await fetch("/api/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demo: true }),
    });
    router.push("/hcp");
    router.refresh();
  }

  async function signOutAndRetry() {
    setSignOutBusy(true);
    await fetch("/api/auth/signout", { method: "POST" });
    router.refresh();
    setSignOutBusy(false);
  }

  return (
    <div className="flex min-h-full flex-col bg-ground text-ink">
      <header className="border-b border-chrome-border bg-chrome-bg px-4 py-4 text-chrome-fg sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <HearthMark className="h-6 w-6" />
            <span className="font-brand text-xl">Hearth</span>
            <span className="text-sm font-semibold text-chrome-fg-muted">Clinical</span>
          </Link>
          <Link
            href="/"
            className="rounded-sm px-3 py-2 text-sm font-semibold text-chrome-fg-muted hover:text-chrome-fg"
          >
            Back to Hearth home
          </Link>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:py-16"
      >
        <section className="lg:pr-4" aria-labelledby="clinician-login-intro">
          <h1 id="clinician-login-intro" className="text-3xl font-bold leading-tight tracking-[-0.02em] text-ink sm:text-4xl">
            Decision support between visits
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-mute">
            Review consented activity patterns, pre-visit notes, and alerts from families who chose to share — with
            source posts and personal baselines attached.
          </p>

          <ul className="mt-8 space-y-4">
            {TRUST_POINTS.map((point) => (
              <li key={point.title} className="flex gap-3">
                <span
                  className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-sm border border-line bg-accent-tint text-clinic"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3.5 8.5 6.5 11.5 12.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{point.title}</p>
                  <p className="mt-1 text-sm leading-6 text-mute">{point.body}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-8 border border-line bg-surface px-4 py-3 text-xs leading-5 text-mute">
            Screening signals only. Not a diagnosis, treatment recommendation, or medical device.
          </p>
        </section>

        <section aria-labelledby="clinician-login-heading" className="mt-10 w-full lg:mt-0">
          <div className="border border-line bg-surface p-6 sm:p-8">
            <h2 id="clinician-login-heading" className="text-xl font-bold text-ink">
              Sign in to the portal
            </h2>
            <p className="mt-2 text-sm leading-6 text-mute">
              Use your authorized Google account. Access is limited to approved clinician emails.
            </p>

            {accessDenied ? (
              <div className="mt-5 border border-rose-200 bg-rose-50 px-4 py-3" role="alert">
                <p className="text-sm font-semibold text-rose-800">Clinician access required</p>
                <p className="mt-1 text-sm leading-6 text-rose-800">
                  {signedInEmail ? (
                    <>
                      <span className="font-medium">{signedInEmail}</span> is not authorized for the clinician portal.
                    </>
                  ) : (
                    <>This account is not authorized for the clinician portal.</>
                  )}{" "}
                  Try an approved email or contact your admin.
                </p>
                {signedInEmail ? (
                  <button
                    type="button"
                    onClick={signOutAndRetry}
                    disabled={signOutBusy}
                    className="mt-3 text-sm font-semibold text-rose-800 underline-offset-4 hover:underline disabled:opacity-60"
                  >
                    {signOutBusy ? "Signing out…" : "Sign out and try another account"}
                  </button>
                ) : null}
              </div>
            ) : null}

            {authError ? (
              <p className="mt-5 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
                Sign-in did not finish. Try again.
              </p>
            ) : null}

            <div className="mt-6">
              <GoogleSignInButton
                next={next}
                supabaseConfig={supabaseConfig}
                authFlow="login"
                variant="primary"
                label="Sign in with Google"
              />
            </div>

            <div className="mt-6 border-t border-line pt-6">
              <p className="text-sm font-semibold text-ink">Preview without signing in</p>
              <p className="mt-1 text-sm leading-6 text-mute">
                Walk through the sample patient list and Elena&apos;s signal view from the demo.
              </p>
              <button
                type="button"
                onClick={openDemo}
                disabled={demoBusy}
                className="mt-4 flex min-h-11 w-full items-center justify-center rounded-sm border border-line bg-ground px-4 text-sm font-semibold text-ink hover:border-ink disabled:opacity-60"
              >
                {demoBusy ? "Opening demo portal…" : "Open demo clinician portal"}
              </button>
            </div>
          </div>

          <nav className="mt-6 flex flex-col gap-3 text-sm text-mute sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <p>
              Family member?{" "}
              <Link
                href={`/login?next=${encodeURIComponent("/family")}`}
                className="font-semibold text-clinic underline-offset-4 hover:underline"
              >
                Family sign in
              </Link>
            </p>
            <p className="flex flex-wrap gap-x-4 gap-y-2">
              <Link href="/" className="font-medium underline-offset-4 hover:text-ink hover:underline">
                Back to Hearth home
              </Link>
              <Link href="/privacy" className="font-medium underline-offset-4 hover:text-ink hover:underline">
                Privacy
              </Link>
            </p>
          </nav>
        </section>
      </main>
    </div>
  );
}
