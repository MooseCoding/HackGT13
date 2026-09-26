import { RemindersBoard } from "@/components/family/RemindersBoard";
import { remindersOf, resolveFamilyId } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const familyId = await resolveFamilyId();
  const reminders = await remindersOf(familyId);
  return <RemindersBoard reminders={reminders} familyId={familyId} />;
}
