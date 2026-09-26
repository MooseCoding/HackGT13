"use client";

import type { FamilyInvitation } from "@/lib/invitations-types";
import { useEffect, useState } from "react";

export function AddMemberPanel({
  familyId,
  onClose,
  onChanged,
}: {
  familyId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Family");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<FamilyInvitation | null>(null);
  const [invites, setInvites] = useState<FamilyInvitation[]>([]);
  const [copied, setCopied] = useState(false);

  async function load() {
    const res = await fetch(`/api/invitations?familyId=${encodeURIComponent(familyId)}`);
    const json = await res.json();
    if (res.ok) setInvites(json.invitations ?? []);
  }

  useEffect(() => {
    void load();
  }, [familyId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setCreated(null);
    const res = await fetch("/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ familyId, name, email, role }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Could not send invite.");
      return;
    }
    setCreated(json.invitation);
    setName("");
    setEmail("");
    await load();
    onChanged();
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy failed — select the link manually.");
    }
  }

  const pending = invites.filter((i) => i.status === "pending");

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-member-title"
    >
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-xl bg-paper p-4 shadow-lg sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="add-member-title" className="text-lg font-semibold">
              Add family member
            </h2>
            <p className="mt-1 text-sm leading-6 text-mute">
              Send an invite link. When they accept with Google, they join the circle and can chat.
            </p>
          </div>
          <button type="button" onClick={onClose} className="min-h-11 px-2 text-sm text-mute hover:text-ink">
            Close
          </button>
        </div>

        <form onSubmit={send} className="mt-4 space-y-3">
          <div>
            <label htmlFor="invite-name" className="block text-sm text-mute">
              Their name
            </label>
            <input
              id="invite-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 min-h-12 w-full rounded-lg border border-line px-3 text-base outline-none focus-visible:border-ember"
              placeholder="Sofia Alvarez"
            />
          </div>
          <div>
            <label htmlFor="invite-email" className="block text-sm text-mute">
              Email
            </label>
            <input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 min-h-12 w-full rounded-lg border border-line px-3 text-base outline-none focus-visible:border-ember"
              placeholder="sofia@example.com"
            />
          </div>
          <div>
            <label htmlFor="invite-role" className="block text-sm text-mute">
              Role
            </label>
            <input
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 min-h-12 w-full rounded-lg border border-line px-3 text-base outline-none focus-visible:border-ember"
            />
          </div>
          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="min-h-12 w-full rounded-lg bg-ember font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send invitation"}
          </button>
        </form>

        {created?.inviteUrl ? (
          <div className="mt-4 rounded-lg border border-line bg-cream p-3">
            <p className="text-sm font-medium text-ink">Invite ready for {created.inviteeName}</p>
            <p className="mt-1 break-all font-mono text-xs text-mute">{created.inviteUrl}</p>
            <button
              type="button"
              onClick={() => copyLink(created.inviteUrl!)}
              className="mt-2 min-h-11 text-sm font-medium text-ember underline-offset-2 hover:underline"
            >
              {copied ? "Copied!" : "Copy invite link"}
            </button>
            <p className="mt-2 text-xs text-mute">
              Share this link (text/email). They sign in with Google and tap Accept to join.
            </p>
          </div>
        ) : null}

        {pending.length ? (
          <div className="mt-5">
            <h3 className="text-sm font-semibold">Pending invites</h3>
            <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
              {pending.map((i) => (
                <li key={i.id} className="px-3 py-2 text-sm">
                  <p className="font-medium">{i.inviteeName}</p>
                  <p className="text-mute">{i.email}</p>
                  {i.inviteUrl ? (
                    <button
                      type="button"
                      onClick={() => copyLink(i.inviteUrl!)}
                      className="mt-1 text-xs font-medium text-ember"
                    >
                      Copy link
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
