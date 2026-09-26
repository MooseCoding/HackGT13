import { HearthMark } from "@/components/HearthMark";
import { HcpNav } from "@/components/hcp/HcpNav";
import { getAuthUser, isClinicianUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/mode-server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HcpLayout({ children }: { children: React.ReactNode }) {
  const demo = await isDemoMode();
  if (!demo) {
    const user = await getAuthUser();
    if (!user) redirect("/login/clinician?next=/hcp");
    if (!(await isClinicianUser())) redirect("/login/clinician?error=access-denied&next=/hcp");
  }
  const user = await getAuthUser();

  return (
    <div className="flex min-h-full flex-col bg-ground text-ink">
      <header className="border-b border-line bg-surface px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <Link href="/hcp" className="flex items-center gap-2 text-ink">
            <HearthMark className="h-6 w-6" />
            <span className="text-lg font-semibold">Hearth</span>
            <span className="text-sm text-mute">Clinical</span>
          </Link>
          <HcpNav userName={user?.name ?? null} />
        </div>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
      <footer className="border-t border-line bg-surface px-4 py-6 sm:px-6">
        <p className="mx-auto max-w-5xl text-xs leading-5 text-mute">
          These are screening signals, not a diagnosis or treatment plan. This product is not a medical device.
          Patients show up here only after a family member turns on clinician sharing.
        </p>
      </footer>
    </div>
  );
}
