import { CalendarBoard } from "@/components/family/CalendarBoard";
import { SCHEDULE_CONFLICT_DEMO_DRAFT } from "@/lib/calendar-conflicts";
import { mergedEventsOf } from "@/lib/calendar-data";
import { familyById, resolveFamilyId } from "@/lib/data";
import { isDemoMode } from "@/lib/mode-server";
import { getPublicSupabaseConfig } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string; autoCall?: string; demo?: string }>;
}) {
  const familyId = await resolveFamilyId();
  const [family, demo, events] = await Promise.all([
    familyById(familyId),
    isDemoMode(),
    mergedEventsOf(familyId),
  ]);
  const q = await searchParams;
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <CalendarBoard
        familyId={familyId}
        supabaseConfig={getPublicSupabaseConfig()}
        initialEvents={events}
        demo={demo}
        initialDraft={q.draft?.trim() || (q.demo === "conflict" ? SCHEDULE_CONFLICT_DEMO_DRAFT : "")}
        offerWeeklyCalls={q.autoCall === "1"}
        autoAddFamilyCalls={family.autoAddFamilyCalls ?? true}
      />
    </div>
  );
}
