import { needsOnboarding } from "@/lib/auth";
import { needsTermsAcceptance } from "@/lib/consent-server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/family";
  const flow = searchParams.get("flow") === "signup" ? "signup" : "login";

  const safeNext = next.startsWith("/") ? next : "/onboarding";
  const loginError = safeNext.startsWith("/hcp")
    ? `${origin}/login/clinician?error=auth&next=${encodeURIComponent(safeNext)}`
    : `${origin}/login?error=auth&next=${encodeURIComponent(safeNext)}`;

  if (!code) {
    return NextResponse.redirect(loginError);
  }

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(loginError);
  }
  if (data.session) {
    const { saveGoogleTokens } = await import("@/lib/google-calendar");
    await saveGoogleTokens(data.session);
  }

  const onboard = await needsOnboarding();
  const dest = safeNext.startsWith("/hcp")
    ? safeNext
    : onboard
      ? "/onboarding"
      : safeNext;

  if (flow === "signup" && (await needsTermsAcceptance())) {
    return NextResponse.redirect(`${origin}/signup?next=${encodeURIComponent(dest)}`);
  }

  return NextResponse.redirect(`${origin}${dest}`);
}
