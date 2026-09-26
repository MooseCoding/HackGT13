import { LandingPage } from "@/components/home/LandingPage";
import { getAuthUser, needsOnboarding } from "@/lib/auth";
import { getPublicSupabaseConfig } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const q = await searchParams;
  const user = await getAuthUser();
  const onboard = user ? await needsOnboarding() : false;
  return (
    <LandingPage
      next={q.next && q.next.startsWith("/") ? q.next : "/onboarding"}
      signedIn={Boolean(user)}
      needsOnboarding={onboard}
      supabaseConfig={getPublicSupabaseConfig()}
    />
  );
}
