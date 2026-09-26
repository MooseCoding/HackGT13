"use client";

import { GoogleSignInButton } from "@/components/home/GoogleSignInButton";
import type { PublicSupabaseConfig } from "@/lib/supabase/public";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Placeholder homepage. Frontend / AI redesign: read `./REDESIGN.md` first.
 * Preserve Google sign-in, onboarding flow, data-home hooks, and a11y landmarks.
 */
export function LandingPage({
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
  const [demoBusy, setDemoBusy] = useState(false);
  const router = useRouter();

  async function openDemo() {
    setDemoBusy(true);
    await fetch("/api/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demo: true }),
    });
    router.push("/family");
    router.refresh();
  }

  return (
    <div className="flex min-h-full flex-col bg-paper">
      <header
        data-home="header"
        className="border-b border-line px-4 py-4 sm:px-6"
      >
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <p className="font-serif text-xl font-semibold tracking-tight text-ink">Hearth</p>
          {signedIn ? (
            <Link
              href={needsOnboarding ? "/onboarding" : "/family"}
              className="min-h-11 rounded-md px-3 py-2 text-sm font-medium text-ember underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
            >
              {needsOnboarding ? "Finish setup" : "Open Hearth"}
            </Link>
          ) : null}
        </div>
      </header>

      <main
        id="main-content"
        data-home="hero"
        className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 sm:px-6 sm:py-16"
      >
        <p className="text-sm font-medium uppercase tracking-wide text-ember">Family, in one place</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
          Come home to the story, not the group chat.
        </h1>
        <p className="mt-4 text-base leading-7 text-mute sm:text-lg">
          Sign in, add the people you love, then use chats, the calendar, this week’s digest, and the
          clinician view.
        </p>

        <section
          data-home="sign-in"
          aria-labelledby="sign-in-heading"
          className="mt-8 rounded-xl border border-line bg-cream p-4 sm:p-6"
        >
          <h2 id="sign-in-heading" className="text-lg font-semibold text-ink">
            {signedIn ? "You’re signed in" : "Sign in to continue"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-mute">
            {signedIn
              ? needsOnboarding
                ? "Add family members next. It only takes a minute."
                : "Your circle is ready."
              : "We only ask for Google. No extra passwords."}
          </p>
          {authError ? (
            <p className="mt-3 text-sm text-red-700" role="alert">
              Google sign-in didn’t finish. Try again, or ask a teammate to enable Google under
              Supabase Auth → Providers.
            </p>
          ) : null}
          <div className="mt-5">
            {signedIn ? (
              <Link
                href={needsOnboarding ? "/onboarding" : "/family"}
                className="flex min-h-12 items-center justify-center rounded-lg bg-ember px-4 text-base font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-dark"
              >
                {needsOnboarding ? "Add family members" : "Go to family chats"}
              </Link>
            ) : (
              <GoogleSignInButton next={next} supabaseConfig={supabaseConfig} />
            )}
          </div>
        </section>

        <p data-home="demo" className="mt-6 text-center text-sm text-mute">
          Judging or designing without Google?{" "}
          <button
            type="button"
            onClick={openDemo}
            disabled={demoBusy}
            className="font-medium text-ember underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:opacity-60"
          >
            {demoBusy ? "Opening demo…" : "Preview the demo family"}
          </button>
        </p>
      </main>

      <footer data-home="footer" className="border-t border-line px-4 py-4 text-center text-xs text-mute">
        Built at HackGT 13 with Impiricus
      </footer>
    </div>
  );
}
