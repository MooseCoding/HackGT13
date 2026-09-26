import { DEMO_COOKIE, isSupabaseConfigured } from "@/lib/mode";
import { isDemoMode } from "@/lib/mode-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    demo: await isDemoMode(),
    supabase: isSupabaseConfigured(),
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { demo?: boolean };
  const demo = Boolean(body.demo);
  if (!demo && !isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase env vars are missing; staying in demo mode." },
      { status: 400 },
    );
  }
  const res = NextResponse.json({ demo, supabase: isSupabaseConfigured() });
  res.cookies.set(DEMO_COOKIE, demo ? "1" : "0", {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
