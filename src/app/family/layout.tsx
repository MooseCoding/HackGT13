import { FamilyChrome, FamilyProvider } from "@/components/family/FamilyChrome";
import { getAuthUser, getProfile, needsOnboarding } from "@/lib/auth";
import { familyById, membersOf, resolveFamilyId } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/mode";
import { isDemoMode } from "@/lib/mode-server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function FamilyLayout({ children }: { children: React.ReactNode }) {
  const demo = await isDemoMode();
  if (!demo && (await needsOnboarding())) redirect("/onboarding");
  const familyId = await resolveFamilyId();
  const [members, user, profile, family] = await Promise.all([
    membersOf(familyId),
    getAuthUser(),
    getProfile(),
    familyById(familyId),
  ]);
  return (
    <FamilyProvider members={members} currentMemberId={demo ? undefined : profile?.member_id ?? undefined}>
      <div className="min-h-full bg-cream">
        <FamilyChrome
          demo={demo}
          canGoLive={isSupabaseConfigured()}
          signedIn={Boolean(user)}
          inviteCode={family.inviteCode}
          identityLocked={!demo && Boolean(profile?.member_id)}
        />
        <div id="main-content">{children}</div>
      </div>
    </FamilyProvider>
  );
}
