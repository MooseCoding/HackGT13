import { DigestView } from "@/components/family/DigestView";
import { digestFor } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DigestPage() {
  const digest = digestFor("alvarez");
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <DigestView initial={digest} />
    </div>
  );
}
