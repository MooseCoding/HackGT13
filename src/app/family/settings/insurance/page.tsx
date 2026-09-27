import { InsuranceSettings } from "@/components/settings/InsuranceSettings";
import { getAuthUser, getProfile, needsOnboarding } from "@/lib/auth";
import { isDemoMode } from "@/lib/mode-server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Insurance - Familyr",
  description: "Add insurance coverage and see in-network clinician matches.",
};

export default async function InsuranceSettingsPage() {
  const demo = await isDemoMode();
  if (!demo) {
    const user = await getAuthUser();
    if (!user) redirect("/login?next=/family/settings/insurance");
    if (await needsOnboarding()) redirect("/onboarding");
    const profile = await getProfile();
    if (!profile?.member_id) redirect("/onboarding");
    return <InsuranceSettings lockedMemberId={profile.member_id} />;
  }

  return <InsuranceSettings demo />;
}
