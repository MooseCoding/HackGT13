import { DigestView } from "@/components/family/DigestView";
import { digestFor, resolveFamilyId } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DigestPage() {
  const familyId = await resolveFamilyId();
  const digest = await digestFor(familyId);
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <DigestView initial={digest} />
    </div>
  );
}
