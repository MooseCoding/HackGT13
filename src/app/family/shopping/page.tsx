import { ShoppingBoard } from "@/components/family/ShoppingBoard";
import { postsOf, resolveFamilyId, wishlistOf } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ShoppingPage() {
  const familyId = await resolveFamilyId();
  const [wishlist, posts] = await Promise.all([wishlistOf(familyId), postsOf(familyId)]);
  return <ShoppingBoard wishlist={wishlist} posts={posts} familyId={familyId} />;
}
