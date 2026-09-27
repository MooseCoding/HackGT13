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
  const user = await getAuthUser();
  if (!user) return true;
  const supabase = await createSupabaseServer();
  const [memberRes, ownedRes] = await Promise.all([
    supabase.from("members").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("families").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
  ]);
  if (memberRes.error) throw new Error(memberRes.error.message);
  if (ownedRes.error) throw new Error(ownedRes.error.message);
  return (memberRes.count ?? 0) + (ownedRes.count ?? 0) < 1;
}

export async function isClinicianUser() {
  if (await isDemoMode()) return true;
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()]);
  if (!user) return false;
  if (profile?.account_role === "clinician" || profile?.account_role === "admin") return true;
  const allowed = (process.env.HCP_CLINICIAN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!user.email || !allowed.includes(user.email.toLowerCase())) return false;
  // RLS only trusts profiles.account_role, so mirror the env allow-list into the
  // database. Otherwise clinician writes (alert review, reports) are rejected.
  await syncClinicianRole(user.id);
  return true;
}

async function syncClinicianRole(userId: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const { createSupabaseAdmin } = await import("./supabase/admin");
    const admin = createSupabaseAdmin();
    const { error } = await admin
      .from("profiles")
      .update({ account_role: "clinician" })
      .eq("id", userId)
      .eq("account_role", "family");
    if (error) console.error("[auth] could not sync clinician role:", error.message);
  } catch (error) {
    console.error("[auth] could not sync clinician role:", error);
  }
}
