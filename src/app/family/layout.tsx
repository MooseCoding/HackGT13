import { FamilyChrome, FamilyProvider } from "@/components/family/FamilyChrome";
import { membersOf } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function FamilyLayout({ children }: { children: React.ReactNode }) {
  const members = membersOf("alvarez");
  return (
    <FamilyProvider members={members}>
      <div className="min-h-full bg-cream">
        <FamilyChrome />
        {children}
      </div>
    </FamilyProvider>
  );
}
