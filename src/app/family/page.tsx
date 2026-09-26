import { ChatApp } from "@/components/family/ChatApp";
import { familyById, membersOf, postsOf } from "@/lib/data";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function FamilyChatPage() {
  const [posts, members, family] = await Promise.all([
    postsOf("alvarez"),
    membersOf("alvarez"),
    familyById("alvarez"),
  ]);

  return (
    <Suspense fallback={<div className="p-4 text-sm text-mute">Loading chats…</div>}>
      <ChatApp posts={posts} members={members} familyName={family.name} />
    </Suspense>
  );
}
