import { needsOnboarding } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/family";

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=auth`);
  }

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/?error=auth`);
  }
  if (data.session) {
    const { saveGoogleTokens } = await import("@/lib/google-calendar");
    await saveGoogleTokens(data.session);
  }

  const onboard = await needsOnboarding();
  const dest = onboard ? "/onboarding" : next.startsWith("/") ? next : "/family";
  const complete = `/auth/complete?next=${encodeURIComponent(dest)}`;
  return NextResponse.redirect(`${origin}${complete}`);
}
