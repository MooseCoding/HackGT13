import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-full bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-4">
          <span className="font-brand text-lg">Hearth</span>
          <span className="font-brand text-sm text-mute">Family, in one place</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="font-brand text-3xl leading-tight text-ink sm:text-4xl">
          Come home to the story, not the group chat.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-mute">
          Family messaging, a shared calendar, and a weekly summary — plus a clinician view for
          opted-in members between visits.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link
            href="/family"
            className="block border border-line bg-cream p-6 hover:border-ember"
          >
            <h2 className="text-lg font-semibold">Family chats</h2>
            <p className="mt-2 text-sm leading-6 text-mute">
              Message the whole family or one person. Voice notes and photos included.
            </p>
          </Link>
          <Link
            href="/hcp"
            className="block border border-line bg-cream p-6 hover:border-clinic"
          >
            <h2 className="text-lg font-semibold">Clinician view</h2>
            <p className="mt-2 text-sm leading-6 text-mute">
              Longitudinal signals for opted-in patients, compared to their own baseline.
            </p>
          </Link>
        </div>
      </main>

      <footer className="border-t border-line py-4 text-center text-xs text-mute">
        Built at HackGT 13 with Impiricus
      </footer>
    </div>
  );
}
