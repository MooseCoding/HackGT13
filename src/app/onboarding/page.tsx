import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { getAuthUser, needsOnboarding } from "@/lib/auth";
import { needsTermsAcceptance } from "@/lib/consent-server";
import { isDemoMode } from "@/lib/mode-server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  if (await isDemoMode()) redirect("/family");
  const user = await getAuthUser();
  if (!user) redirect("/");
  if (await needsTermsAcceptance()) redirect("/?next=/onboarding");
  if (!(await needsOnboarding())) redirect("/family");

  return (
    <div className="min-h-full bg-ground">
      <header className="bg-ink px-4 py-4">
        <p className="font-brand text-xl">Hearth</p>
      </header>
      <main id="main-content" className="max-w-xl px-4 py-8 sm:py-12">
        <h1 className="text-2xl font-bold text-ink">Set up your circle</h1>
        <p className="mt-2 text-base leading-7 text-mute">
          Name your circle and add your family, or join with an invite code if someone already invited you.
        </p>
        <div className="mt-8">
          <OnboardingForm defaultName={user.name} />
        </div>
      </main>
    </div>
  );
}
