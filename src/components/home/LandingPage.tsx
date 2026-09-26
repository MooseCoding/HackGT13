"use client";

import { HearthMark } from "@/components/HearthMark";
import type { PublicSupabaseConfig } from "@/lib/supabase/public";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Homepage for judges and new families. Preserve Google sign-in, demo entry,
 * data-home hooks, and a11y landmarks — see `./REDESIGN.md`.
 */
export function LandingPage({
  next,
  signedIn,
  needsOnboarding,
}: {
  next: string;
  signedIn: boolean;
  needsOnboarding: boolean;
  supabaseConfig: PublicSupabaseConfig | null;
}) {
  const [demoBusy, setDemoBusy] = useState(false);
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

  const destination = needsOnboarding ? "/onboarding" : "/family";

  return (
    <div className="flex min-h-full flex-col bg-ground">
      <header
        data-home="header"
        className="border-b border-chrome-border bg-chrome-bg px-4 py-4 text-chrome-fg sm:px-6"
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <HearthMark className="h-6 w-6" />
            <span className="font-brand text-xl">Familyr</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            {signedIn ? (
              <Link
                href={destination}
                className="big inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm bg-ember px-3.5 text-sm font-semibold text-white hover:bg-ember-dark active:bg-ember-dark"
              >
                {needsOnboarding ? "Finish setup" : "Open Familyr"}
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
            ) : (
              <>
                <Link
                  href={`/login?next=${encodeURIComponent(next)}`}
                  className="inline-flex min-h-11 items-center rounded-sm border border-chrome-border px-3.5 text-sm font-semibold text-chrome-fg hover:border-chrome-fg"
                >
                  Sign in
                </Link>
                <Link
                  href={`/signup?next=${encodeURIComponent(next)}`}
                  className="inline-flex min-h-11 items-center rounded-sm bg-ember px-3.5 text-sm font-semibold text-white hover:bg-ember-dark"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section
        data-home="hero"
        className="border-b border-line bg-accent-tint px-4 py-12 sm:px-6 sm:py-16"
      >
        <div className="landing-rise mx-auto max-w-5xl">
          <h1 className="max-w-2xl text-4xl font-bold leading-[1.1] tracking-[-0.02em] text-ink sm:text-5xl sm:leading-[1.08]">
            Stay close without living in the group chat.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-7 text-mute sm:text-xl sm:leading-8">
            One chat thread, a shared calendar, and Hestia, your weekly story. Reply when you can.
          </p>
          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {signedIn ? (
              <Link
                href={destination}
                className="flex min-h-12 items-center justify-center rounded-sm bg-ember px-5 text-base font-semibold text-white hover:bg-ember-dark"
              >
                {needsOnboarding ? "Add your family" : "Open your circle"}
              </Link>
            ) : (
              <>
                <Link
                  href={`/login?next=${encodeURIComponent(next)}`}
                  className="flex min-h-12 items-center justify-center rounded-sm bg-ember px-5 text-base font-semibold text-white hover:bg-ember-dark"
                >
                  Sign in
                </Link>
                <Link
                  href={`/signup?next=${encodeURIComponent(next)}`}
                  className="flex min-h-12 items-center justify-center rounded-sm border border-line bg-surface px-5 text-base font-semibold text-ink hover:border-ink"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <main id="main-content" className="flex-1">
        <section
          className="border-b border-line bg-surface px-4 py-10 sm:px-6 sm:py-12"
          aria-labelledby="chat-banner-heading"
        >
          <div className="landing-rise landing-rise-delay-1 mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <h2 id="chat-banner-heading" className="text-2xl font-bold text-ink sm:text-3xl">
                One thread. Reply when you can.
              </h2>
              <p className="mt-3 max-w-prose text-base leading-7 text-mute">
                Everyone answers on their own schedule. One circle, one thread. Nobody has to chase
                you for a reply.
              </p>
            </div>
            <div className="border border-line bg-ground p-4 sm:p-5" aria-hidden="true">
              <div className="space-y-3">
                <div className="max-w-[85%] rounded-sm border border-line bg-chat-in px-3 py-2 text-sm text-ink">
                  Dad&apos;s flight lands Thursday at 6. Can someone pick him up?
                </div>
                <div className="ml-auto max-w-[80%] rounded-sm border border-line bg-chat-out px-3 py-2 text-sm text-ink">
                  I&apos;ll be there. Adding it to the shared calendar.
                </div>
                <div className="max-w-[75%] rounded-sm border border-line bg-chat-in px-3 py-2 text-sm text-ink">
                  Perfect. We can sort out the rest this week.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="border-b border-line bg-ground px-4 py-10 sm:px-6 sm:py-12"
          aria-labelledby="hestia-banner-heading"
        >
          <div className="landing-rise landing-rise-delay-2 mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div className="order-2 border border-line bg-surface p-5 sm:p-6 lg:order-1">
              <p className="font-letter text-base leading-7 text-ink sm:text-lg sm:leading-8">
                <span className="block text-sm font-sans font-semibold text-ember">Hestia · week of Sep 15</span>
                <span className="mt-3 block">
                  Maria posted from the porch twice. James said he&apos;d grab Dad at the airport
                  Thursday. Two plans set, one story to keep.
                </span>
              </p>
            </div>
            <div className="order-1 lg:order-2">
              <h2 id="hestia-banner-heading" className="text-2xl font-bold text-ink sm:text-3xl">
                A weekly recap instead of more pings
              </h2>
              <p className="mt-3 max-w-prose text-base leading-7 text-mute">
                Hestia turns the week&apos;s messages and plans into a short letter you can read in
                a few minutes.
              </p>
            </div>
          </div>
        </section>

        <section
          className="border-b border-line bg-accent-tint px-4 py-10 sm:px-6 sm:py-12"
          aria-labelledby="calendar-banner-heading"
        >
          <div className="mx-auto max-w-5xl">
            <h2 id="calendar-banner-heading" className="text-2xl font-bold text-ink sm:text-3xl">
              When you make plans in chat, the calendar keeps up
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-mute">
              Pickups, visits, and calls from chat show up on the shared calendar. Clinicians only
              see anything if someone in the family turns sharing on.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="border border-line bg-surface p-5">
                <p className="text-sm font-semibold text-ink">Shared calendar</p>
                <p className="mt-2 text-sm leading-6 text-mute">
                  Visits, calls, and airport runs in one place. Built from what you already said in
                  chat.
                </p>
              </div>
              <div className="border border-line bg-surface p-5">
                <p className="text-sm font-semibold text-ink">Opt-in clinician view</p>
                <p className="mt-2 text-sm leading-6 text-mute">
                  Relevant posts and baselines for that person, if sharing is on. For care
                  decisions, not diagnosis.
                </p>
                <Link
                  href="/login/clinician?next=/hcp"
                  className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-clinic underline-offset-4 hover:underline"
                >
                  Clinician sign in
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section data-home="demo" className="px-4 py-10 sm:px-6 sm:py-12" aria-labelledby="demo-heading">
          <div className="mx-auto max-w-5xl">
            <h2 id="demo-heading" className="text-xl font-bold text-ink sm:text-2xl">
              Preview the Alvarez &amp; Okonkwo circles
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-mute sm:text-base">
              Walk through a sample family&apos;s chat, calendar, and weekly story before you sign
              up.
            </p>
            <button
              type="button"
              onClick={() => openDemo("/family")}
              disabled={demoBusy}
              className="mt-6 flex min-h-12 items-center justify-center rounded-sm border border-line bg-surface px-5 text-sm font-semibold text-ink hover:border-ink disabled:opacity-60 sm:inline-flex"
            >
              {demoBusy ? "Opening sample…" : "Open sample family"}
            </button>
          </div>
        </section>
      </main>

      <footer data-home="footer" className="border-t border-line bg-surface px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="flex items-center gap-2">
                <HearthMark className="h-5 w-5" />
                <span className="font-brand text-lg">Familyr</span>
              </p>
              <p className="mt-3 max-w-md text-sm leading-6 text-mute">
                Nothing goes to a clinician unless someone in your family turns sharing on.
              </p>
            </div>
            <div className="text-sm">
              <p>
                <Link href="/privacy" className="font-medium text-clinic underline-offset-4 hover:underline">
                  Privacy
                </Link>
                <span className="mx-2 text-mute" aria-hidden="true">·</span>
                <Link href="/login" className="font-medium text-clinic underline-offset-4 hover:underline">
                  Sign in
                </Link>
                <span className="mx-2 text-mute" aria-hidden="true">·</span>
                <Link href="/signup" className="font-medium text-clinic underline-offset-4 hover:underline">
                  Sign up
                </Link>
              </p>
              <p className="mt-4 text-mute">
                Clinician?{" "}
                <Link href="/login/clinician?next=/hcp" className="font-medium text-clinic underline-offset-4 hover:underline">
                  Sign in to the portal
                </Link>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
