import { getPublicSupabaseConfig } from "@/lib/supabase/public";
import { NextResponse } from "next/server";

/** Debug helper: confirms the server can see Supabase public env vars. */
export async function GET() {
  const config = getPublicSupabaseConfig();
  return NextResponse.json({
    configured: Boolean(config),
    url: config?.url ?? null,
    hasAnonKey: Boolean(config?.anonKey),
  });
}
