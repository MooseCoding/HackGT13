"use client";

import { HcpReportingModeToggle } from "@/components/hcp/HcpReportingModeToggle";
import type { HcpReportingMode } from "@/lib/hcp-settings";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Temporarily hidden — live signal demo is still a test idea. */
const SHOW_LIVE_SIGNAL = false;

function navClass(active: boolean) {
  return active
    ? "inline-flex min-h-9 items-center border border-line bg-ground px-3 text-sm font-semibold text-ink"
    : "inline-flex min-h-9 items-center px-3 text-sm font-semibold text-mute hover:text-ink";
}

export function HcpNav({
  userName,
  reportingMode,
}: {
  userName: string | null;
  reportingMode: HcpReportingMode;
}) {
  const pathname = usePathname();
  const onPatients = pathname === "/hcp" || pathname.startsWith("/hcp/patients");
  const onLive = pathname.startsWith("/hcp/live");

  return (
    <nav className="flex flex-wrap items-center gap-1 sm:gap-2" aria-label="Clinician">
      <Link href="/hcp" className={navClass(onPatients)} aria-current={onPatients ? "page" : undefined}>
        Patients
      </Link>
      {SHOW_LIVE_SIGNAL ? (
        <Link href="/hcp/live" className={navClass(onLive)} aria-current={onLive ? "page" : undefined}>
          Live signal
        </Link>
      ) : null}
      <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
      <HcpReportingModeToggle initialMode={reportingMode} />
      <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
      <span className="hidden text-xs text-mute sm:block">{userName ?? "Demo clinician"}</span>
    </nav>
  );
}
