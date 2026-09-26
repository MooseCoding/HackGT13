import { FamilyChrome, FamilyProvider } from "@/components/family/FamilyChrome";
import { membersOf } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function FamilyLayout({ children }: { children: React.ReactNode }) {
  const members = membersOf("alvarez");
  return (
    <FamilyProvider members={members}>
      <div className="min-h-full bg-cream">
        <FamilyChrome />
        <div className="mx-auto max-w-3xl px-4 py-6">{children}</div>
      </div>
    </FamilyProvider>
  );
}
