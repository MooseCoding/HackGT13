import { CircleView } from "@/components/family/CircleView";
import { calendarAnchor } from "@/lib/clock";
import { familyById, membersOf, postsOf, resolveFamilyId } from "@/lib/data";
import { isDemoMode } from "@/lib/mode-server";

export const dynamic = "force-dynamic";

export default async function CirclePage() {
  const familyId = await resolveFamilyId();
  const demo = await isDemoMode();
  const [members, posts, family] = await Promise.all([
    membersOf(familyId),
    postsOf(familyId),
    familyById(familyId),
  ]);
  const now = calendarAnchor(demo);

  return (
    <CircleView
      members={members}
      posts={posts}
      inviteCode={family.inviteCode}
      familyName={family.name}
      familyId={familyId}
      nowIso={now.toISOString()}
    />
  );
}
