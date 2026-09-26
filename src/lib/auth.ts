import { isDemoMode } from "./mode-server";
import { createSupabaseServer } from "./supabase/server";
import type { Database } from "./supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export async function getAuthUser() {
  if (await isDemoMode()) return null;
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const meta = data.user.user_metadata ?? {};
  const name =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    data.user.email ||
    "You";
  return { id: data.user.id, email: data.user.email, name };
}

export async function getProfile(): Promise<Profile | null> {
  const user = await getAuthUser();
  if (!user) return null;
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data;
  const inserted = await supabase
    .from("profiles")
    .insert({ id: user.id, display_name: user.name })
    .select("*")
    .maybeSingle();
  if (inserted.error) {
    const retry = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    return retry.data ?? null;
  }
  return inserted.data;
}

export async function needsOnboarding() {
  if (await isDemoMode()) return false;
  const profile = await getProfile();
  if (!profile?.family_id) return true;
  const supabase = await createSupabaseServer();
  const { count, error } = await supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("family_id", profile.family_id);
  if (error) throw new Error(error.message);
  return (count ?? 0) < 1;
}
