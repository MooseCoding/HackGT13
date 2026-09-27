import { FamilyrLogo } from "@/components/FamilyrLogo";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { getAuthUser, needsOnboarding } from "@/lib/auth";
import { isDemoMode } from "@/lib/mode-server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  if (await isDemoMode()) redirect("/family");
  const user = await getAuthUser();
  if (!user) redirect("/login?next=/onboarding");
  if (!(await needsOnboarding())) redirect("/family");

  return (
    <div className="min-h-full bg-ground">
      <header className="border-b border-chrome-border bg-chrome-bg px-4 py-4 text-chrome-fg">
        <FamilyrLogo />
      </header>
      <main id="main-content" className="max-w-xl px-4 py-8 sm:py-12">
        <h1 className="text-2xl font-bold text-ink">Set up your circle</h1>
        <p className="mt-2 text-base leading-7 text-mute">
          Name your circle and add people, or join with an invite code if someone already invited you.
        </p>
        <div className="mt-8">
          <OnboardingForm defaultName={user.name} />
        </div>
      </main>
    </div>
  );
}
