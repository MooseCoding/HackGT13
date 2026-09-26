import { ClinicalSharingSettings } from "@/components/settings/ClinicalSharingSettings";
import { getAuthUser, getProfile, needsOnboarding } from "@/lib/auth";
import { membersOf, resolveFamilyId } from "@/lib/data";
import { isDemoMode } from "@/lib/mode-server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Clinician sharing — Familyr",
  description: "Review warnings and confirm clinician pattern sharing for your profile.",
};

export default async function ClinicalSharingPage() {
  const demo = await isDemoMode();
  if (demo) redirect("/family");

  const user = await getAuthUser();
  if (!user) redirect("/login?next=/family/settings/clinical-sharing");

  if (await needsOnboarding()) redirect("/onboarding");

  const profile = await getProfile();
  if (!profile?.member_id) redirect("/onboarding");

  const familyId = await resolveFamilyId();
  const members = await membersOf(familyId);
  const member = members.find((m) => m.id === profile.member_id);
  if (!member) redirect("/family");

  return <ClinicalSharingSettings memberId={member.id} initialEnabled={member.clinicalOptIn} />;
}
