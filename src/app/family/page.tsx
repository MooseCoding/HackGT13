import { ChatApp } from "@/components/family/ChatApp";
import { familyById, membersOf, postsOf, resolveFamilyId } from "@/lib/data";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function FamilyChatPage() {
  const familyId = await resolveFamilyId();
  const [posts, members, family] = await Promise.all([
    postsOf(familyId),
    membersOf(familyId),
    familyById(familyId),
  ]);

  return (
    <Suspense fallback={<div className="p-4 text-sm text-mute">Loading chats…</div>}>
      <ChatApp posts={posts} members={members} familyName={family.name} />
    </Suspense>
  );
}
