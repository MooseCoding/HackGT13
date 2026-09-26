import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-full bg-cream">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-ember text-paper shadow-sm">
            ⌂
          </span>
          <div>
            <p className="font-serif text-xl tracking-tight">Hearth</p>
            <p className="text-xs text-mute">HackGT 13 · Meta + Impiricus</p>
          </div>
        </div>
        <p className="hidden text-sm text-mute sm:block">The week, stitched together.</p>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-20">
        <section className="grid gap-10 py-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ember-dark">
              Digital living room
            </p>
            <h1 className="mt-3 font-serif text-5xl leading-[1.05] tracking-tight text-ink sm:text-6xl">
              Come home to the story, not the group chat.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-mute">
              Families drop texts, voice notes, and photos whenever. Hearth turns the scatter into a
              warm weekly digest — and, with consent, gives clinicians a quieter window between
              visits.
            </p>
          </div>
          <div className="rounded-3xl border border-line bg-paper p-5 shadow-[0_20px_50px_rgba(44,33,24,0.08)]">
            <p className="text-xs uppercase tracking-widest text-mute">This week</p>
            <p className="mt-2 font-serif text-2xl">The tomatoes waited all summer.</p>
            <p className="mt-2 text-sm leading-6 text-mute">
              Elena, Miguel, Priya, Sofia, and James — one circle, two time zones of campus and porch.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Link
            href="/family"
            className="group rounded-3xl bg-ink p-8 text-paper transition hover:-translate-y-0.5"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-orange-200">Phase 1 · Family</p>
            <h2 className="mt-3 font-serif text-3xl">Enter the Hearth</h2>
            <p className="mt-3 text-sm leading-6 text-orange-100/80">
              Feed, voice, calendar in plain language, and a narrated weekly story. Easy mode for
              extra-large tap targets.
            </p>
            <span className="mt-6 inline-flex text-sm font-semibold text-orange-200 group-hover:underline">
              Open family app →
            </span>
          </Link>
          <Link
            href="/hcp"
            className="group rounded-3xl border border-line bg-paper p-8 transition hover:-translate-y-0.5"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-clinic">Phase 2 · Impiricus</p>
            <h2 className="mt-3 font-serif text-3xl text-ink">Clinician portal</h2>
            <p className="mt-3 text-sm leading-6 text-mute">
              Opted-in longitudinal language, engagement, and affect — compared to each patient&apos;s
              own baseline, not a generic cutoff.
            </p>
            <span className="mt-6 inline-flex text-sm font-semibold text-clinic group-hover:underline">
              Open HCP dashboard →
            </span>
          </Link>
        </section>
      </main>
    </div>
  );
}
