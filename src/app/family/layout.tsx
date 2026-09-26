import { FamilyChrome, FamilyProvider } from "@/components/family/FamilyChrome";
import { FamilySettingsDefaults } from "@/components/settings/FamilySettingsDefaults";
import { getAuthUser, getProfile, needsOnboarding } from "@/lib/auth";
import { needsTermsAcceptance } from "@/lib/consent-server";
import { eventsOf, familiesForUser, familyById, membersOf, postsOf, resolveFamilyId } from "@/lib/data";
import { calendarAnchor } from "@/lib/clock";
import { isSupabaseConfigured } from "@/lib/mode";
import { isDemoMode } from "@/lib/mode-server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function FamilyLayout({ children }: { children: React.ReactNode }) {
  const demo = await isDemoMode();
  if (!demo) {
    if (await needsTermsAcceptance()) redirect("/?next=/family");
    if (await needsOnboarding()) redirect("/onboarding");
  }
  const familyId = await resolveFamilyId();
  const [{ families, activeId }, members, user, profile, family, events, posts] = await Promise.all([
    familiesForUser(),
    membersOf(familyId),
    getAuthUser(),
    getProfile(),
    familyById(familyId),
    eventsOf(familyId),
    postsOf(familyId),
  ]);
  const now = calendarAnchor(demo).getTime();
  const upcomingEvents = events
    .filter((e) => new Date(e.startsAt).getTime() >= now - 12 * 60 * 60 * 1000)
    .slice(0, 8)
    .map((e) => {
      const when = new Date(e.startsAt).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      return `${when}: ${e.title}${e.location ? ` @ ${e.location}` : ""}`;
    });
  const currentMember = demo
    ? members.find((m) => m.easyModeDefault)
    : members.find((m) => m.id === profile?.member_id);
  const settingsFallback = { largerText: currentMember?.easyModeDefault ?? false };
  const nameById = Object.fromEntries(members.map((m) => [m.id, m.name]));
  const recentPosts = posts.slice(0, 8).map((p) => {
    const text = (p.transcript || p.body).slice(0, 100);
    return `${nameById[p.authorId] ?? "Someone"}: ${text}`;
  });
  return (
    <>
      <FamilySettingsDefaults largerTextDefault={settingsFallback.largerText ?? false} />
      <FamilyProvider members={members} currentMemberId={demo ? undefined : profile?.member_id ?? undefined}>
        <div className="chat-surface min-h-full">
          <FamilyChrome
            demo={demo}
            canGoLive={isSupabaseConfigured()}
            signedIn={Boolean(user)}
            inviteCode={family.inviteCode}
            identityLocked={!demo && Boolean(profile?.member_id)}
            families={families}
            activeFamilyId={activeId}
            activeFamilyName={family.name}
            userDisplayName={profile?.display_name ?? user?.name}
            assistantContext={{
              familyName: family.name,
              inviteCode: family.inviteCode,
              memberNames: members.map((m) => m.name),
              upcomingEvents,
              recentPosts,
            }}
          />
          <div id="main-content">{children}</div>
        </div>
      </FamilyProvider>
    </>
  );
}
