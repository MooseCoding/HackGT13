import { FamilyChrome, FamilyProvider } from "@/components/family/FamilyChrome";
import { getAuthUser, needsOnboarding } from "@/lib/auth";
import { membersOf, resolveFamilyId } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/mode";
import { isDemoMode } from "@/lib/mode-server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function FamilyLayout({ children }: { children: React.ReactNode }) {
  const demo = await isDemoMode();
  if (!demo && (await needsOnboarding())) redirect("/onboarding");
  const familyId = await resolveFamilyId();
  const [members, user] = await Promise.all([membersOf(familyId), getAuthUser()]);
  return (
    <FamilyProvider members={members}>
      <div className="min-h-full bg-cream">
        <FamilyChrome demo={demo} canGoLive={isSupabaseConfigured()} signedIn={Boolean(user)} />
        <div id="main-content">{children}</div>
      </div>
    </FamilyProvider>
  );
}
