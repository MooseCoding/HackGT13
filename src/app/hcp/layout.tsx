import { getAuthUser, needsOnboarding } from "@/lib/auth";
import { isDemoMode } from "@/lib/mode-server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HcpLayout({ children }: { children: React.ReactNode }) {
  const demo = await isDemoMode();
  if (!demo && (await needsOnboarding())) redirect("/onboarding");
  const user = await getAuthUser();

  return (
    <div className="min-h-full bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/hcp" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white shadow-sm">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 3v18M3 12h18" /></svg>
            </span>
            <span>
              <span className="block font-brand text-base leading-5 text-slate-950">Hearth Clinical</span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">Powered by Impiricus</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-sm" aria-label="Clinician">
            <Link href="/hcp" className="rounded-lg bg-blue-50 px-3 py-2 font-semibold text-blue-700" aria-current="page">
              Patients
            </Link>
            <Link href="/hcp/live" className="rounded-lg px-3 py-2 font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700">
              Live signal
            </Link>
            <Link href="/family" className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800">
              Family app
            </Link>
            <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />
            {user ? <span className="hidden text-xs text-slate-500 sm:block">{user.name}</span> : <span className="hidden text-xs text-slate-500 sm:block">Demo clinician</span>}
            <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">DR</span>
          </nav>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
