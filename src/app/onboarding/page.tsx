import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { getAuthUser, needsOnboarding } from "@/lib/auth";
import { isDemoMode } from "@/lib/mode-server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  if (await isDemoMode()) redirect("/family");
  const user = await getAuthUser();
  if (!user) redirect("/");
  if (!(await needsOnboarding())) redirect("/family");

  return (
    <div className="min-h-full bg-cream">
      <header className="border-b border-line bg-paper px-4 py-4">
        <div className="mx-auto max-w-lg">
          <p className="font-serif text-xl font-semibold tracking-tight">Hearth</p>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-lg px-4 py-8 sm:py-12">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Add your family</h1>
        <p className="mt-2 text-base leading-7 text-mute">
          These names show up in chats, the calendar, and the weekly story. You can post as any of
          them.
        </p>
        <div className="mt-8">
          <OnboardingForm defaultName={user.name} />
        </div>
      </main>
    </div>
  );
}
