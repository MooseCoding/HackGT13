import { FamilyrLogo } from "@/components/FamilyrLogo";
import Link from "next/link";

export const metadata = {
  title: "Privacy - Familyr",
  description: "Where messages go, what clinicians can see, and the switches that actually matter.",
};

const SECTIONS = [
  {
    title: "At a glance",
    body: [
      "Familyr is for day-to-day family stuff. It is not a medical device and it does not diagnose, treat, or replace a real clinician.",
      "Messages stay in your circle unless someone opts a profile into clinician pattern sharing.",
      "Healthcare insights, Google Calendar, and demo mode are separate. You pick what to turn on.",
    ],
  },
  {
    title: "What we store",
    body: [
      "Google sign-in makes a Supabase auth profile with your name, email, and circle membership.",
      "Posts, calendar events, reminders, and circle settings are visible to people in that circle. Not people outside it.",
      "Larger text and other display prefs live in your browser. They do not sync to our servers.",
    ],
  },
  {
    title: "Circle boundary",
    body: [
      "Chat, voice transcripts, photos, and calendar entries stay with the people in the circle. They are not posted to the open web.",
      "Hestia (the weekly story) uses that same in-circle activity. The story stays in Familyr.",
      "Invite links work like a house key. Only send them to people you actually want in.",
    ],
  },
  {
    title: "Healthcare insights (opt-in)",
    body: [
      "Clinician view is off until you turn it on. Then authorized care-team accounts can see activity patterns for that profile.",
      "Familyr reads messages as written and derives metadata (posting cadence, word variety, repetition) against your own baseline. That is not a diagnosis.",
      "Turn it off and your profile drops out of the clinician portal. If you never opted in, you do not show up there at all.",
      "NLP scoring runs on-device when we can, so raw message text stays off third-party inference for those clinical signals.",
    ],
  },
  {
    title: "Google sign-in and calendar",
    body: [
      "Auth goes through Supabase OAuth 2.0 against your Google account. We only get the profile fields Google sends for apps you approve.",
      "Calendar is a separate permission. Familyr reads calendars you connect to show visit and call timing. Nothing extra.",
      "The sample-circle demo does not need an account. It runs locally with seed data on this device.",
    ],
  },
  {
    title: "Hestia and in-app help",
    body: [
      "Hestia turns a week's messages and events into one story using Meta Muse 1.3, or Meta's latest model when available. Conversation starters look at your circle's chat. Inputs stay in the circle.",
      "Familyr Assistant answers questions using what is on your screen. It is in-app help, not the Hestia weekly story.",
    ],
  },
  {
    title: "Your controls",
    body: [
      "General consent is required before using Familyr as a family coordination product.",
      "Healthcare insights and family call rhythm are optional at sign-in. You can change them later.",
      "Leave a circle, turn off clinician sharing, or sign out whenever. Leaving demo mode clears sample data from this session.",
    ],
  },
  {
    title: "HackGT build",
    body: [
      "Familyr is a HackGT 13 demo. This page is how it works right now. A real product would add retention schedules, data export, and account deletion.",
      "Privacy questions on this build: reach the team through the hackathon repo or your project channel.",
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <div className="min-h-full bg-ground">
      <header className="border-b border-line bg-surface px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <FamilyrLogo />
          <Link
            href="/"
            className="min-h-11 px-3 py-2 text-sm font-medium text-clinic underline-offset-4 hover:underline"
          >
            Back home
          </Link>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Privacy</h1>
        <p className="mt-4 max-w-2xl text-lg leading-7 text-mute">
          Where your family&apos;s messages go, what clinicians can see, and which toggles actually matter.
        </p>

        <div className="mt-10 space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.title} aria-labelledby={`privacy-${section.title}`}>
              <h2 id={`privacy-${section.title}`} className="text-xl font-semibold text-ink">
                {section.title}
              </h2>
              <div className="mt-3 space-y-3 text-base leading-7 text-mute">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-12 border-t border-line pt-8 text-sm text-mute">
          Last updated September 2026.{" "}
          <Link href="/" className="font-medium text-clinic underline-offset-4 hover:underline">
            Return to Familyr
          </Link>
        </p>
      </main>
    </div>
  );
}
