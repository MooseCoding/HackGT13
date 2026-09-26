import { CalendarBoard } from "@/components/family/CalendarBoard";
import { eventsOf, membersOf } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const [events, members] = await Promise.all([eventsOf("alvarez"), membersOf("alvarez")]);
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <CalendarBoard events={events} members={members} />
    </div>
  );
}
