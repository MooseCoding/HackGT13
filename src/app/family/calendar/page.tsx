import { CalendarBoard } from "@/components/family/CalendarBoard";
import { resolveFamilyId } from "@/lib/data";
import { getPublicSupabaseConfig } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const familyId = await resolveFamilyId();
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <CalendarBoard familyId={familyId} supabaseConfig={getPublicSupabaseConfig()} />
    </div>
  );
}
