import { CalendarBoard } from "@/components/family/CalendarBoard";
import { eventsOf, membersOf, resolveFamilyId } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const familyId = await resolveFamilyId();
  const [events, members] = await Promise.all([eventsOf(familyId), membersOf(familyId)]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <CalendarBoard events={events} members={members} />
    </div>
  );
}
