"use client";

import { GoogleSignInButton } from "@/components/home/GoogleSignInButton";
import { HearthMark } from "@/components/HearthMark";
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
  const pending = invitation.status === "pending";
  const canAccept = pending && (signedIn || demo);

  async function accept() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/invitations/${encodeURIComponent(token)}`, { method: "POST" });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Could not accept invitation.");
      return;
    }
    if (json.memberId && typeof window !== "undefined") {
      localStorage.setItem("hearth-me", json.memberId);
    }
    router.push("/family");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <HearthMark className="h-8 w-8" />
        <p className="font-serif text-2xl tracking-tight text-ink">Hearth</p>
      </div>

      <h1 className="font-serif text-3xl tracking-tight text-ink">Join {invitation.familyName}</h1>
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
        <p className="mt-6 rounded-lg border border-line bg-cream px-4 py-3 text-sm text-ink" role="status">
          This invitation is {invitation.status}.{" "}
          {invitation.status === "accepted" ? (
            <a href="/family" className="font-medium text-ember underline-offset-2 hover:underline">
              Open chats
            </a>
          ) : null}
        </p>
      ) : null}

      {pending && !canAccept ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm leading-6 text-mute">Sign in with Google to accept and start chatting.</p>
          <GoogleSignInButton next={`/invite/${token}`} supabaseConfig={supabaseConfig} />
        </div>
      ) : null}

      {canAccept ? (
        <div className="mt-6 space-y-3">
          {demo && !signedIn ? (
            <p className="text-sm text-mute">Demo mode — you can join without Google.</p>
          ) : null}
          <button
            type="button"
            onClick={accept}
            disabled={busy}
            className="min-h-12 w-full rounded-lg bg-ember font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Joining…" : "Accept & join family"}
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
