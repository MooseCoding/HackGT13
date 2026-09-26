import Link from "next/link";

export default function HcpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-[#f4f8f8] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-800">Impiricus</p>
            <p className="font-serif text-xl">Hearth clinical channel</p>
          </div>
          <nav className="flex gap-4 text-sm font-semibold">
            <Link href="/hcp" className="text-teal-800">
              Panel
            </Link>
            <Link href="/family" className="text-slate-500">
              Family app
            </Link>
            <Link href="/" className="text-slate-500">
              Home
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
