import { getAuthUser, getProfile } from "./auth";
import {
  DEFAULT_FAMILY_CALL_FREQUENCY,
  type FamilyCallFrequency,
} from "./family-call-frequency";
import { isDemoMode } from "./mode-server";
import { createSupabaseServer } from "./supabase/server";

export type AccountConsent = {
  termsAccepted: boolean;
  healthcareConsent: boolean;
  familyCallFrequency: FamilyCallFrequency;
  termsAcceptedAt?: string | null;
  healthcareConsentAt?: string | null;
};

const FREQUENCIES = new Set<FamilyCallFrequency>(["weekly", "biweekly", "monthly", "none"]);

function parseFrequency(value: unknown): FamilyCallFrequency {
  if (typeof value === "string" && FREQUENCIES.has(value as FamilyCallFrequency)) {
    return value as FamilyCallFrequency;
  }
  return DEFAULT_FAMILY_CALL_FREQUENCY;
}

function consentFromMetadata(meta: Record<string, unknown> | undefined): AccountConsent {
  const termsAcceptedAt =
    typeof meta?.terms_accepted_at === "string" ? meta.terms_accepted_at : null;
  const healthcareConsentAt =
    typeof meta?.healthcare_consent_at === "string" ? meta.healthcare_consent_at : null;
  return {
    termsAccepted: Boolean(termsAcceptedAt),
    healthcareConsent: Boolean(healthcareConsentAt),
    familyCallFrequency: parseFrequency(meta?.family_call_frequency),
    termsAcceptedAt,
    healthcareConsentAt,
  };
}

async function readUserMetadata(): Promise<Record<string, unknown> | null> {
  if (await isDemoMode()) return null;
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return (data.user.user_metadata ?? {}) as Record<string, unknown>;
}

export async function getAccountConsent(): Promise<AccountConsent> {
  const meta = await readUserMetadata();
  if (!meta) {
    return {
      termsAccepted: false,
      healthcareConsent: false,
      familyCallFrequency: DEFAULT_FAMILY_CALL_FREQUENCY,
      termsAcceptedAt: null,
      healthcareConsentAt: null,
    };
  }
  return consentFromMetadata(meta);
}

export async function needsTermsAcceptance(): Promise<boolean> {
  if (await isDemoMode()) return false;
  const user = await getAuthUser();
  if (!user) return false;
  const consent = await getAccountConsent();
  return !consent.termsAccepted;
}

export async function profileHealthcareConsentEnabled(): Promise<boolean> {
  const consent = await getAccountConsent();
  return consent.healthcareConsent;
}

export async function syncHealthcareConsentMetadata(enabled: boolean): Promise<void> {
  if (await isDemoMode()) return;
  const user = await getAuthUser();
  if (!user) return;
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.updateUser({
    data: {
      healthcare_consent_at: enabled ? new Date().toISOString() : null,
    },
  });
  if (error) throw new Error(error.message);
}

export async function applyHealthcareConsentToMember(enabled: boolean): Promise<void> {
  if (await isDemoMode()) return;
  const user = await getAuthUser();
  if (!user) return;
  const profile = await getProfile();
  const supabase = await createSupabaseServer();
  if (profile?.member_id) {
    const { error } = await supabase
      .from("members")
      .update({ clinical_opt_in: enabled })
      .eq("id", profile.member_id)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase
    .from("members")
    .update({ clinical_opt_in: enabled })
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
}

export async function setAccountConsent(patch: {
  termsAccepted?: boolean;
  healthcareConsent?: boolean;
  familyCallFrequency?: FamilyCallFrequency;
}): Promise<AccountConsent> {
  if (await isDemoMode()) {
    return {
      termsAccepted: Boolean(patch.termsAccepted),
      healthcareConsent: Boolean(patch.healthcareConsent),
      familyCallFrequency: patch.familyCallFrequency ?? DEFAULT_FAMILY_CALL_FREQUENCY,
    };
  }
  const user = await getAuthUser();
  if (!user) throw new Error("Sign in to update consent.");

  const current = await getAccountConsent();
  const nowIso = new Date().toISOString();
  const nextMeta: Record<string, unknown> = {};

  if (patch.termsAccepted === true) {
    nextMeta.terms_accepted_at = current.termsAcceptedAt || nowIso;
  }

  if (typeof patch.healthcareConsent === "boolean") {
    nextMeta.healthcare_consent_at = patch.healthcareConsent
      ? current.healthcareConsentAt || nowIso
      : null;
  }

  if (patch.familyCallFrequency) {
    nextMeta.family_call_frequency = parseFrequency(patch.familyCallFrequency);
  }

  if (Object.keys(nextMeta).length) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.updateUser({ data: nextMeta });
    if (error) throw new Error(error.message);
  }

  if (typeof patch.healthcareConsent === "boolean") {
    await applyHealthcareConsentToMember(patch.healthcareConsent);
  }

  return getAccountConsent();
}
