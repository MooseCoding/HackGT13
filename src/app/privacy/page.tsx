import Link from "next/link";

export const metadata = {
  title: "Privacy — Familyr",
  description: "Data handling, consent boundaries, and sharing controls for Familyr.",
};

const SECTIONS = [
  {
    title: "At a glance",
    body: [
      "Familyr helps families coordinate day to day. It is not a medical device and does not diagnose, treat, or replace professional care.",
      "Messages in your circle stay inside that circle unless you explicitly opt a profile into clinician pattern sharing.",
      "Healthcare insights, Google Calendar, and demo mode are separate permissions. You decide what to enable.",
    ],
  },
  {
    title: "What we store",
    body: [
      "Google sign-in creates a Supabase auth profile with your name, email, and circle membership.",
      "Posts, calendar events, reminders, and circle settings are visible to members of that circle — nobody outside it.",
      "Larger text and other display preferences live in your browser's local storage. They do not sync to our servers.",
    ],
  },
  {
    title: "Circle boundary",
    body: [
      "Chat messages, voice transcripts, photos, and calendar entries circulate within your circle membership. They are not published to the open web.",
      "Hestia, the weekly story, draws from that same in-circle activity. Its output stays inside Familyr.",
      "Invite links grant access to a circle. Hand them out the way you would a house key.",
    ],
  },
  {
    title: "Healthcare insights (opt-in)",
    body: [
      "Clinician view is off by default. Turning it on flags your member profile for clinical sharing and exposes activity patterns to authorized care-team accounts.",
      "Familyr reads messages as written and derives metadata — posting cadence, lexical variety, repetition frequency — for decision-support signals against your personal baseline. That is not a diagnosis.",
      "Revoke consent and your profile drops out of the clinician portal. Members who never opted in do not appear there at all.",
      "NLP scoring runs on-device when possible, keeping raw message text off third-party inference pipelines for clinical signals.",
    ],
  },
  {
    title: "Google sign-in and calendar",
    body: [
      "Authentication runs through Supabase OAuth 2.0 against your Google account. We receive only the profile fields Google returns for apps you authorize.",
      "Calendar integration is a separate scope. Familyr reads connected calendars to surface visit and call timing — nothing beyond what you link.",
      "The sample-family demo needs no account. It runs locally with seed data on this device.",
    ],
  },
  {
    title: "Hestia and in-app help",
    body: [
      "Hestia compiles a week's messages and events into one narrative using Meta Muse 1.3, or Meta's latest model when available. Conversation starters read your circle's chat to suggest connections. Inputs stay confined to your circle.",
      "Familyr Assistant answers questions using your current screen context. It is in-app support — not the Hestia weekly story.",
    ],
  },
  {
    title: "Your controls",
    body: [
      "General consent is required before using Familyr as a family coordination product.",
      "Healthcare insights and family call rhythm are optional at sign-in and can be changed afterward.",
      "Leave a circle, disable clinician sharing, or sign out whenever you want. Exiting demo mode clears sample data from this session.",
    ],
  },
  {
    title: "HackGT build",
    body: [
      "Familyr is a HackGT 13 demonstration build. This page reflects current design intent; a production release would add formal retention schedules, data export, and account deletion.",
      "Privacy questions on this build: reach the team through the hackathon repo or your project channel.",
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <div className="min-h-full bg-ground">
      <header className="border-b border-line bg-surface px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Link href="/" className="font-brand text-xl">
            Familyr
          </Link>
          <Link
            href="/"
            className="min-h-11 px-3 py-2 text-sm font-medium text-clinic underline-offset-4 hover:underline"
          >
            Back home
          </Link>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Privacy &amp; data practices</h1>
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
