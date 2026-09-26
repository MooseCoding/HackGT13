import { ClinicianLoginPage } from "@/components/home/ClinicianLoginPage";
import { getAuthUser, isClinicianUser } from "@/lib/auth";
import { getPublicSupabaseConfig } from "@/lib/supabase/public";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clinician sign in — Hearth Clinical",
  description: "Sign in to the authorized clinician portal for consented family activity patterns.",
};

export default async function ClinicianLogin({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const q = await searchParams;
  const next = q.next && q.next.startsWith("/hcp") ? q.next : "/hcp";
  const user = await getAuthUser();

  if (user && (await isClinicianUser())) {
    redirect(next);
  }

  return (
    <ClinicianLoginPage
      next={next}
      authError={q.error === "auth"}
      accessDenied={Boolean(user) || q.error === "access-denied"}
      signedInEmail={user?.email ?? null}
      supabaseConfig={getPublicSupabaseConfig()}
    />
  );
}
