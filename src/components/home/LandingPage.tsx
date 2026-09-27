"use client";

import { FamilyrLogo } from "@/components/FamilyrLogo";
import type { PublicSupabaseConfig } from "@/lib/supabase/public";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const TEAM = [
  {
    name: "Topher",
    also: "Christopher Fontana",
    role: "Social connection & chat",
    school: "Georgia Tech · Physics & Aerospace Engineering · Class of 2029",
    github: { href: "https://github.com/MooseCoding", label: "MooseCoding" },
    linkedin: "https://www.linkedin.com/in/christopher-fontana-469b35359",
  },
  {
    name: "Olivia",
    also: "Ziqi Wang",
    role: "Marketing, branding & writing",
    school: "Green River College · Computer Science · Class of 2029",
    github: { href: "https://github.com/wangziqiolivia", label: "wangziqiolivia" },
    linkedin: "https://www.linkedin.com/in/ziqi-wang-00a724397",
  },
  {
    name: "Nish",
    also: "Sadnan Nishthup",
    role: "Backend & clinician portal",
    school: "Stony Brook University · Computer Science · Class of 2030",
    github: { href: "https://github.com/nishchup489-afk", label: "nishchup489-afk" },
    linkedin: "https://www.linkedin.com/in/sadnan-nishthup-7405273a5",
  },
] as const;

const FEATURES = [
  {
    title: "One thread",
    body: "One Circle, one chat for your whole Family. Reply when you can.",
  },
  {
    title: "Calendar",
    body: "Plans mentioned in chat can land on a shared calendar so nobody re-types them.",
  },
  {
    title: "Hestia",
    body: "A weekly story that summarizes what happened in the Circle so you can catch up without scrolling.",
  },
  {
    title: "Clinician view (optional)",
    body: "Families can turn on sharing so a care team sees patterns in messages. Nothing is shared unless someone opts in.",
  },
] as const;

/**
 * Homepage for judges and new families. Preserve demo entry,
 * data-home hooks, and a11y landmarks - see `./REDESIGN.md`.
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
        className="border-b border-line bg-surface px-4 py-4 sm:px-6"
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <FamilyrLogo />
          <div className="flex items-center gap-2">
            <a
              href="#about"
              className="hidden min-h-11 items-center px-2 text-sm text-mute hover:text-ink sm:inline-flex"
            >
              About
            </a>
            {signedIn ? (
              <Link
                href={destination}
                className="inline-flex min-h-11 items-center rounded-sm bg-ember px-3.5 text-sm font-medium text-white hover:bg-ember-dark"
              >
                {needsOnboarding ? "Finish setup" : "Open your Circle"}
              </Link>
            ) : (
              <>
                <Link
                  href={`/login?next=${encodeURIComponent(next)}`}
                  className="inline-flex min-h-11 items-center px-3 text-sm text-mute hover:text-ink"
                >
                  Sign in
                </Link>
                <Link
                  href={`/signup?next=${encodeURIComponent(next)}`}
                  className="inline-flex min-h-11 items-center rounded-sm bg-ember px-3.5 text-sm font-medium text-white hover:bg-ember-dark"
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
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Familyr
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-ink sm:text-lg">
            Help families stay connected when schedules do not line up.
          </p>
          <p className="mt-3 max-w-2xl text-base leading-7 text-mute">
            Familyr gives each Circle one thread, a shared calendar, and Hestia, the weekly
            story. Families choose what to share; clinicians only see what someone turns on.
          </p>
          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {signedIn ? (
              <Link
                href={destination}
                className="inline-flex min-h-11 items-center justify-center rounded-sm bg-ember px-5 text-sm font-medium text-white hover:bg-ember-dark"
              >
                {needsOnboarding ? "Finish setup" : "Open your Circle"}
              </Link>
            ) : (
              <>
                <Link
                  href={`/signup?next=${encodeURIComponent(next)}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-sm bg-ember px-5 text-sm font-medium text-white hover:bg-ember-dark"
                >
                  Create a Circle
                </Link>
                <button
                  type="button"
                  onClick={() => openDemo("/family")}
                  disabled={demoBusy}
                  data-home="demo"
                  className="inline-flex min-h-11 items-center justify-center rounded-sm border border-line bg-surface px-5 text-sm font-medium text-ink hover:border-ink disabled:opacity-60"
                >
                  {demoBusy ? "Opening demo…" : "Try the demo"}
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <main id="main-content" className="flex-1">
        <section
          className="border-b border-line px-4 py-12 sm:px-6 sm:py-14"
          aria-labelledby="features-heading"
        >
          <div className="mx-auto max-w-3xl">
            <p className="text-sm font-medium text-ember">Product</p>
            <h2 id="features-heading" className="mt-1 text-xl font-semibold text-ink">
              What it does
            </h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <li
                  key={feature.title}
                  className="rounded-sm border border-line bg-surface p-5"
                >
                  <h3 className="text-base font-medium text-ink">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-mute">{feature.body}</p>
                </li>
              ))}
            </ul>
            <p className="mt-6 rounded-sm border border-line bg-ground px-4 py-3 text-sm text-mute">
              Clinicians can{" "}
              <Link
                href="/login/clinician?next=/hcp"
                className="font-medium text-clinic underline-offset-4 hover:underline"
              >
                sign in here
              </Link>
              .
            </p>
          </div>
        </section>

        <section
          id="about"
          className="scroll-mt-20 bg-surface px-4 py-12 sm:px-6 sm:py-14"
          aria-labelledby="about-heading"
        >
          <div className="mx-auto max-w-3xl">
            <p className="text-sm font-medium text-ember">About</p>
            <h2 id="about-heading" className="mt-1 text-xl font-semibold text-ink">
              Why we built it
            </h2>
            <div className="mt-6 rounded-sm border border-line bg-ground p-6 sm:p-8">
              <div className="space-y-4 text-sm leading-7 text-mute sm:text-base">
                <p>
                  We all live far from our families. Olivia is an international student from
                  Beijing. Topher and Nish have the same distance problem in different states and
                  cities. In college, finding a time to call is hard. We wanted one thread, a shared
                  calendar, and a simple way to catch up without another pile of group chats.
                </p>
                <p>
                  The clinical side started with Topher&apos;s grandmother. Small changes in her
                  texts were easy to miss during everyday conversation. During HackGT 13 she moved
                  into assisted living. We added an optional clinician view so families can share
                  message patterns early, only if they choose to.
                </p>
              </div>
            </div>

            <ul className="mt-10 grid gap-4 sm:grid-cols-3">
              {TEAM.map((person) => (
                <li
                  key={person.name}
                  className="rounded-sm border border-line bg-ground p-5"
                >
                  <p className="font-medium text-ink">{person.name}</p>
                  <p className="mt-1 text-sm text-mute">{person.role}</p>
                  <p className="mt-2 text-sm leading-6 text-mute">{person.school}</p>
                  <p className="mt-4 flex gap-3 text-sm">
                    <a
                      href={person.github.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-clinic underline-offset-4 hover:underline"
                    >
                      GitHub
                    </a>
                    <a
                      href={person.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-clinic underline-offset-4 hover:underline"
                    >
                      LinkedIn
                    </a>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer data-home="footer" className="border-t border-line bg-accent-tint px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <FamilyrLogo href={null} markClassName="h-5 w-5" wordmarkClassName="font-brand text-lg" />
          <p className="mt-3 max-w-xl text-sm leading-6 text-mute">
            Nothing goes to a clinician unless someone in your Family turns sharing on.
          </p>
          <p className="mt-4 text-sm text-mute">
            <a href="#about" className="font-medium text-clinic underline-offset-4 hover:underline">
              About
            </a>
            <span className="mx-2" aria-hidden="true">·</span>
            <Link href="/privacy" className="font-medium text-clinic underline-offset-4 hover:underline">
              Privacy
            </Link>
            <span className="mx-2" aria-hidden="true">·</span>
            <Link href="/login" className="font-medium text-clinic underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
