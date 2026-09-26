import { ChatApp } from "@/components/family/ChatApp";
import { familyById, membersOf, postsOf } from "@/lib/store";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function FamilyChatPage() {
  const posts = postsOf("alvarez");
  const members = membersOf("alvarez");
  const family = familyById("alvarez");

  return (
    <Suspense fallback={<div className="p-4 text-sm text-mute">Loading chats…</div>}>
      <ChatApp posts={posts} members={members} familyName={family.name} />
    </Suspense>
  );
}
