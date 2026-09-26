import { LoginPage } from "@/components/home/LoginPage";
import { getAuthUser, needsOnboarding } from "@/lib/auth";
import { getPublicSupabaseConfig } from "@/lib/supabase/public";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const q = await searchParams;
  const next = q.next && q.next.startsWith("/") ? q.next : "/onboarding";
  const user = await getAuthUser();
  const onboard = user ? await needsOnboarding() : false;

  if (user) {
    redirect(onboard ? "/onboarding" : next);
  }

  return (
    <LoginPage
      next={next}
      authError={q.error === "auth"}
      supabaseConfig={getPublicSupabaseConfig()}
    />
  );
}
