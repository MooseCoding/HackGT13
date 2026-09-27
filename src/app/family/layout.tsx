import { FamilyChrome, FamilyProvider } from "@/components/family/FamilyChrome";
import { getAuthUser, getProfile, needsOnboarding } from "@/lib/auth";
import { familiesForUser, familyById, membersOf, resolveFamilyId } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/mode";
import { isDemoMode } from "@/lib/mode-server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function FamilyLayout({ children }: { children: React.ReactNode }) {
  const demo = await isDemoMode();
  if (!demo) {
    if (await needsOnboarding()) redirect("/onboarding");
  }
  const familyId = await resolveFamilyId();
  const [{ families, activeId }, members, user, profile, family] = await Promise.all([
    familiesForUser(),
    membersOf(familyId),
    getAuthUser(),
    getProfile(),
    familyById(familyId),
  ]);
  return (
    <FamilyProvider members={members} currentMemberId={demo ? undefined : profile?.member_id ?? undefined}>
      <FamilyChrome
        demo={demo}
        canGoLive={isSupabaseConfigured()}
        signedIn={Boolean(user)}
        identityLocked={!demo && Boolean(profile?.member_id)}
        families={families}
        activeFamilyId={activeId}
        activeFamilyName={family.name}
        autoAddFamilyCalls={family.autoAddFamilyCalls ?? true}
        userDisplayName={profile?.display_name ?? user?.name}
      >
        {children}
      </FamilyChrome>
    </FamilyProvider>
  );
}
