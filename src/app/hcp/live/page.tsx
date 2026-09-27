import { LiveSignalDemo } from "@/components/hcp/LiveSignalDemo";
import { isDemoMode } from "@/lib/mode-server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LiveDemoPage() {
  const demo = await isDemoMode();

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-ink">Live clinical signal</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-mute">
          Deterministic WhatsApp → voice metrics → baseline compare path for demos.
          One click injects Elena-style sustained-shift signals so Wi‑Fi or Meta webhooks
          cannot kill the clinical story.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link href="/hcp/eval" className="font-semibold text-clinic hover:underline">
            Golden eval cases
          </Link>
          <Link href="/hcp/patients/ruth" className="font-semibold text-clinic hover:underline">
            Open Ruth&apos;s chart
          </Link>
        </div>
      </header>
      {demo ? (
        <LiveSignalDemo />
      ) : (
        <section className="border border-line bg-surface p-5 text-sm text-mute">
          Live simulation is available in demo mode. Open Familyr with{" "}
          <code className="rounded-sm border border-line bg-ground px-1.5 py-0.5 text-xs">NEXT_PUBLIC_DEMO_MODE=true</code>{" "}
          or use &ldquo;Preview the demo family&rdquo; first.
        </section>
      )}
    </div>
  );
}
