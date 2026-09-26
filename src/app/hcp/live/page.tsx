import { LiveSignalDemo } from "@/components/hcp/LiveSignalDemo";

export const dynamic = "force-dynamic";

export default function LiveDemoPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Live signal demo</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-mute">
        Ruth sends a voice note like she always does. Hearth turns it into private communication markers and
        sends only what changed to the care team — not the family chat.
      </p>
      <div className="mt-6">
        <LiveSignalDemo />
      </div>
    </div>
  );
}
