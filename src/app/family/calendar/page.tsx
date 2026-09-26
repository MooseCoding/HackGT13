import { CalendarBoard } from "@/components/family/CalendarBoard";
import { eventsOf, membersOf } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function CalendarPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <CalendarBoard events={eventsOf("alvarez")} members={membersOf("alvarez")} />
    </div>
  );
}
