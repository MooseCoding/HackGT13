import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicSupabaseConfig } from "./public";
import type { Database } from "./types";

export type { PublicSupabaseConfig } from "./public";

let browserClient: SupabaseClient<Database> | undefined;

export function createSupabaseBrowser(config?: PublicSupabaseConfig) {
  const url = config?.url ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = config?.anonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env vars are missing. Copy .env.example to .env.local and restart the app.",
    );
  }
  if (!config && browserClient) return browserClient;
  const client = createBrowserClient<Database>(url, key);
  if (!config) browserClient = client;
  return client;
}
