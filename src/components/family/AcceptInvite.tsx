"use client";

import { GoogleSignInButton } from "@/components/home/GoogleSignInButton";
import { SignInConsent } from "@/components/home/SignInConsent";
import { FamilyrLogo } from "@/components/FamilyrLogo";
import { DEFAULT_FAMILY_CALL_FREQUENCY, type FamilyCallFrequency } from "@/lib/family-call-frequency";
import type { InvitationPreview } from "@/lib/invitations-types";
import type { PublicSupabaseConfig } from "@/lib/supabase/public";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AcceptInvite({
  token,
  invitation,
  signedIn,
  demo,
  supabaseConfig,
}: {
  token: string;
  invitation: InvitationPreview;
  signedIn: boolean;
  demo: boolean;
  supabaseConfig: PublicSupabaseConfig | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generalConsent, setGeneralConsent] = useState(false);
  const [healthcareConsent, setHealthcareConsent] = useState(false);
  const [familyCallFrequency, setFamilyCallFrequency] = useState<FamilyCallFrequency>(DEFAULT_FAMILY_CALL_FREQUENCY);
  const pending = invitation.status === "pending";
  const canAccept = pending && (signedIn || demo);

  async function accept() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/invitations/${encodeURIComponent(token)}`, { method: "POST" });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Could not join this circle. Try again or ask for a new invite link.");
      return;
    }
    if (json.memberId && typeof window !== "undefined") {
      localStorage.setItem("hearth-me", json.memberId);
    }
    router.push("/family");
    router.refresh();
  }

  return (
    <main className="min-h-dvh bg-ground px-4 py-10">
      <div className="mb-6 border-b border-line pb-4">
        <FamilyrLogo href={null} markClassName="h-8 w-8" wordmarkClassName="font-brand text-2xl" />
      </div>

      <h1 className="text-2xl font-bold text-ink">Join {invitation.familyName}</h1>
      <p className="mt-2 text-base leading-7 text-mute">
        {invitation.inviteeName} was invited as <span className="text-ink">{invitation.role}</span>
        {invitation.email ? (
          <>
            {" "}
            ({invitation.email})
          </>
        ) : null}
        .
      </p>

      {!pending ? (
        <p className="mt-6 border border-line px-4 py-3 text-sm text-ink" role="status">
          This invitation is {invitation.status}.{" "}
          {invitation.status === "accepted" ? (
            <a href="/family" className="font-medium text-accent hover:underline">
              Open Messages
            </a>
          ) : null}
        </p>
      ) : null}

      {pending && !canAccept ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm leading-6 text-mute">Review the consent choices below, then sign in with Google.</p>
          <SignInConsent
            generalAccepted={generalConsent}
            healthcareAccepted={healthcareConsent}
            familyCallFrequency={familyCallFrequency}
            onGeneralChange={setGeneralConsent}
            onHealthcareChange={setHealthcareConsent}
            onFamilyCallFrequencyChange={setFamilyCallFrequency}
          />
          <GoogleSignInButton
            next={`/invite/${token}`}
            supabaseConfig={supabaseConfig}
            disabled={!generalConsent}
            healthcareConsent={healthcareConsent}
            familyCallFrequency={familyCallFrequency}
            storePendingConsent
            authFlow="signup"
            label="Sign up with Google"
          />
        </div>
      ) : null}

      {canAccept ? (
        <div className="mt-6 space-y-3">
            {demo && !signedIn ? (
            <p className="text-sm text-mute">Sample mode: you can join without Google.</p>
          ) : null}
          <button
            type="button"
            onClick={accept}
            disabled={busy}
            className="min-h-12 w-full rounded-sm bg-ember font-semibold text-white hover:bg-ember-dark disabled:opacity-60"
          >
            {busy ? "Joining…" : "Join circle"}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </main>
  );
}
