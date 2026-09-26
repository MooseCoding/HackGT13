import { CalendarBoard } from "@/components/family/CalendarBoard";
import { eventsOf, membersOf } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function CalendarPage() {
  return <CalendarBoard events={eventsOf("alvarez")} members={membersOf("alvarez")} />;
}
