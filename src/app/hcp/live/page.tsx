import { LiveSignalDemo } from "@/components/hcp/LiveSignalDemo";

export const dynamic = "force-dynamic";

export default function LiveDemoPage() {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Judge mode</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">No new app. One live signal.</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Ruth sends the kind of WhatsApp voice note she already sends. Hearth reduces it to private, longitudinal communication markers and routes only the change—not her family conversation—to the care team.</p>
      <div className="mt-7"><LiveSignalDemo /></div>
      <p className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs leading-5 text-blue-900">Demonstration data only. Hearth surfaces screening signals for human review and never diagnoses disease or replaces validated assessment.</p>
    </div>
  );
}
