export const DEMO_COOKIE = "hearth-demo";
export const FAMILY_COOKIE = "hearth-family";

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Cookie "1" forces mock data; "0" forces Supabase when keys exist. */
export function demoModeFromCookie(value: string | undefined) {
  if (value === "1") return true;
  if (value === "0") return !isSupabaseConfigured();
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return true;
  return !isSupabaseConfigured();
}
