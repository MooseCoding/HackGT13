import { DigestView } from "@/components/family/DigestView";
import { digestFor } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DigestPage() {
  const digest = await digestFor("alvarez");
  return <DigestView initial={digest} />;
}
