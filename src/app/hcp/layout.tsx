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
    <div className="min-h-full bg-clinic-paper text-clinic-ink">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <div>
            <Link href="/" className="font-serif text-base font-semibold tracking-tight">
              Hearth
            </Link>
            <p className="text-xs text-mute">Clinician view</p>
          </div>
          <nav className="flex gap-4 text-sm" aria-label="Clinician">
            <Link href="/hcp" className="min-h-11 py-2 font-medium text-clinic" aria-current="page">
              Patients
            </Link>
            <Link href="/family" className="min-h-11 py-2 text-mute hover:text-ink">
              Family app
            </Link>
            {user ? (
              <span className="min-h-11 py-2 text-xs text-mute">{user.name}</span>
            ) : null}
          </nav>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
