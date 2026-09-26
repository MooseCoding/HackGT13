import { CalendarBoard } from "@/components/family/CalendarBoard";
import { familyById, resolveFamilyId } from "@/lib/data";
import { getPublicSupabaseConfig } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string; autoCall?: string }>;
}) {
  const familyId = await resolveFamilyId();
  const family = await familyById(familyId);
  const q = await searchParams;
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <CalendarBoard
        familyId={familyId}
        supabaseConfig={getPublicSupabaseConfig()}
        initialDraft={q.draft?.trim() || ""}
        offerWeeklyCalls={q.autoCall === "1"}
        autoAddFamilyCalls={family.autoAddFamilyCalls ?? true}
      />
    </div>
  );
}
