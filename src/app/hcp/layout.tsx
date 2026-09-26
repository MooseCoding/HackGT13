import Link from "next/link";

export default function HcpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-clinic-paper text-clinic-ink">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <div>
            <Link href="/" className="font-brand text-base">
              Hearth
            </Link>
            <p className="text-xs text-mute">Clinician view</p>
          </div>
          <nav className="flex gap-4 text-sm">
            <Link href="/hcp" className="font-medium text-clinic">
              Patients
            </Link>
            <Link href="/family" className="text-mute hover:text-ink">
              Family app
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-6">{children}</main>
    </div>
  );
}
