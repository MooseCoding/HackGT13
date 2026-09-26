import { SignupPage } from "@/components/home/SignupPage";
import { getAuthUser, needsOnboarding } from "@/lib/auth";
import { needsTermsAcceptance } from "@/lib/consent-server";
import { getPublicSupabaseConfig } from "@/lib/supabase/public";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Signup({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const q = await searchParams;
  const next = q.next && q.next.startsWith("/") ? q.next : "/onboarding";
  const user = await getAuthUser();
  const onboard = user ? await needsOnboarding() : false;
  const terms = user ? await needsTermsAcceptance() : false;

  if (user && !terms) {
    redirect(onboard ? "/onboarding" : next);
  }

  return (
    <SignupPage
      next={next}
      authError={q.error === "auth"}
      signedIn={Boolean(user)}
      needsOnboarding={onboard}
      supabaseConfig={getPublicSupabaseConfig()}
    />
  );
}
