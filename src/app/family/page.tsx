import { Composer } from "@/components/family/Composer";
import { FeedList } from "@/components/family/FeedList";
import { membersOf, postsOf } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function FamilyFeedPage() {
  const posts = postsOf("alvarez");
  const members = membersOf("alvarez");
  return (
    <div>
      <h1 className="font-serif text-4xl tracking-tight">The porch</h1>
      <p className="mt-2 text-mute">Drop a note whenever. Nobody has to catch it live.</p>
      <div className="mt-6">
        <Composer />
      </div>
      <FeedList posts={posts} members={members} />
    </div>
  );
}
