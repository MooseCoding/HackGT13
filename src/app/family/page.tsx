import { ChatApp } from "@/components/family/ChatApp";
import { mergedEventsOf } from "@/lib/calendar-data";
import { calendarAnchor } from "@/lib/clock";
import { familyById, membersOf, postsOf, resolveFamilyId } from "@/lib/data";
import { isDemoMode } from "@/lib/mode-server";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function FamilyChatPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string; with?: string; draft?: string; invite?: string }>;
}) {
  const familyId = await resolveFamilyId();
  const demo = await isDemoMode();
  const params = await searchParams;
  const [posts, members, family, events] = await Promise.all([
    postsOf(familyId),
    membersOf(familyId),
    familyById(familyId),
    mergedEventsOf(familyId),
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
  const nameById = Object.fromEntries(members.map((m) => [m.id, m.name]));
  const recentPosts = posts.slice(0, 8).map((p) => {
    const text = (p.transcript || p.body).slice(0, 100);
    return `${nameById[p.authorId] ?? "Someone"}: ${text}`;
  });

  return (
    <Suspense fallback={<div className="p-4 text-sm text-mute">Loading messages…</div>}>
      <ChatApp
        posts={posts}
        members={members}
        familyName={family.name}
        inviteCode={family.inviteCode}
        events={events}
        demo={demo}
        initialWith={params.with}
        initialDraft={params.draft}
        initialInvite={params.invite === "1"}
        assistantContext={{
          familyName: family.name,
          inviteCode: family.inviteCode,
          memberNames: members.map((m) => m.name),
          upcomingEvents,
          recentPosts,
        }}
      />
    </Suspense>
  );
}
