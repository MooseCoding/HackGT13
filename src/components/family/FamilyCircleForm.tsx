"use client";

import { AddressFields } from "@/components/onboarding/AddressFields";
import { emptyAddress, formatAddress, type Address } from "@/lib/address";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type DraftMember = {
  name: string;
  role: string;
  age: string;
  address: Address;
  isYou: boolean;
};

const ROLES = ["Grandparent", "Parent", "Partner", "Child", "Grandchild", "Aunt/Uncle", "Family"];

function emptyMember(isYou = false, name = ""): DraftMember {
  return { name, role: isYou ? "Me" : "Family", age: "", address: emptyAddress(), isYou };
}

export function FamilyCircleForm({
  defaultName = "",
  redirectOnSuccess = true,
  onSuccess,
  submitLabel,
  variant = "full",
  initialMode = "create",
  hideModeToggle = false,
}: {
  defaultName?: string;
  redirectOnSuccess?: boolean;
  onSuccess?: () => void;
  submitLabel?: string;
  variant?: "full" | "compact";
  initialMode?: "create" | "join";
  hideModeToggle?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">(initialMode);
  const [inviteCode, setInviteCode] = useState("");
  const [memberName, setMemberName] = useState(defaultName);
  const [familyName, setFamilyName] = useState("");
  const [members, setMembers] = useState<DraftMember[]>([emptyMember(true, defaultName)]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const youIndex = useMemo(() => members.findIndex((m) => m.isYou), [members]);
  const compact = variant === "compact";

  function update(i: number, patch: Partial<DraftMember>) {
    setMembers((list) =>
      list.map((m, idx) => {
        if (idx !== i) return patch.isYou ? { ...m, isYou: false } : m;
        return { ...m, ...patch };
      }),
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "join") {
      if (!inviteCode.trim() || !memberName.trim()) {
        setError("Enter the invite code and your full name exactly as your family added it.");
        return;
      }
      setBusy(true);
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, inviteCode, memberName, redirect: redirectOnSuccess }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not join this circle. Check the invite code and your name, then try again.");
        setBusy(false);
        return;
      }
      if (redirectOnSuccess) {
        router.push("/family");
        router.refresh();
      } else {
        onSuccess?.();
        router.refresh();
      }
      setBusy(false);
      return;
    }

    if (compact) {
      if (!familyName.trim()) {
        setError("Give your new circle a name.");
        return;
      }
      const youName = (defaultName || memberName).trim();
      if (!youName) {
        setError("We need your name for this circle.");
        return;
      }
      setBusy(true);
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyName,
          members: [{ name: youName, role: "Me", age: 0, location: "Home", isYou: true }],
          redirect: redirectOnSuccess,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not create your circle. Check the circle name and try again.");
        setBusy(false);
        return;
      }
      if (redirectOnSuccess) {
        router.push("/family");
        router.refresh();
      } else {
        onSuccess?.();
        router.refresh();
      }
      setBusy(false);
      return;
    }

    if (!familyName.trim()) {
      setError("Enter a circle name so everyone knows which household this is.");
      return;
    }
    const filled = members.filter((m) => m.name.trim());
    if (filled.length < 1) {
      setError("Add yourself, then anyone else you want in the circle.");
      return;
    }
    const missingAddress = filled.find((m) => !m.address.street.trim() || !m.address.city.trim());
    if (missingAddress) {
      setError(
        `Add a street and city for ${missingAddress.name.trim() || "each person"} so visits and calls have a place.`,
      );
      return;
    }
    setBusy(true);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familyName,
        members: filled.map((m) => ({
          name: m.name,
          role: m.role,
          age: Number(m.age) || 0,
          location: formatAddress(m.address),
          address: m.address,
          isYou: m.isYou,
        })),
        redirect: redirectOnSuccess,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Could not save your circle. Check each person's name and address, then try again.");
      setBusy(false);
      return;
    }
    if (redirectOnSuccess) {
      router.push("/family");
      router.refresh();
    } else {
      onSuccess?.();
      router.refresh();
    }
    setBusy(false);
  }

  const defaultSubmit =
    mode === "join" ? "Join circle" : compact ? "Create & switch" : "Create circle";

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {!hideModeToggle ? (
        <div
          className="grid grid-cols-2 border-b border-line"
          role="group"
          aria-label="Family setup choice"
        >
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`min-h-11 border-b-2 text-sm font-semibold ${
              mode === "create"
                ? "border-accent text-ink"
                : "border-transparent text-mute hover:text-ink"
            }`}
          >
            New circle
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className={`min-h-11 border-b-2 text-sm font-semibold ${
              mode === "join"
                ? "border-accent text-ink"
                : "border-transparent text-mute hover:text-ink"
            }`}
          >
            Join with code
          </button>
        </div>
      ) : null}

      {mode === "join" ? (
        <div className="space-y-3">
          <p className="text-sm leading-6 text-mute">
            {compact
              ? "Enter the code from your family organizer. Your name must match the profile they set up for you."
              : "Ask the family organizer for the invite code. Your name must match the profile they created for you."}
          </p>
          <div>
            <label htmlFor="fc-invite-code" className="block text-sm font-medium">Invite code</label>
            <input
              id="fc-invite-code"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              placeholder="ALVAREZ42"
              autoCapitalize="characters"
              autoComplete="off"
              className="mt-1 min-h-12 w-full border border-line bg-surface px-3 font-mono uppercase outline-none focus-visible:border-accent"
            />
          </div>
          <div>
            <label htmlFor="fc-member-name" className="block text-sm font-medium">Your full name</label>
            <input
              id="fc-member-name"
              value={memberName}
              onChange={(event) => setMemberName(event.target.value)}
              autoComplete="name"
              className="mt-1 min-h-12 w-full border border-line bg-surface px-3 outline-none focus-visible:border-accent"
            />
          </div>
        </div>
      ) : compact ? (
        <div className="space-y-3">
          <p className="text-sm leading-6 text-mute">
            Start a new circle for another household. You can add everyone else later from Chats.
          </p>
          <div>
            <label htmlFor="fc-family-name" className="block text-sm font-medium text-ink">Circle name</label>
            <input
              id="fc-family-name"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="The Alvarez Circle"
              autoComplete="organization"
              className="mt-1 min-h-12 w-full border border-line bg-surface px-3 text-base outline-none focus-visible:border-accent"
            />
          </div>
          {defaultName ? (
            <p className="border border-line px-3 py-2 text-sm text-mute">
              You&apos;ll join as <strong className="font-medium text-ink">{defaultName}</strong>
            </p>
          ) : (
            <div>
              <label htmlFor="fc-compact-you" className="block text-sm font-medium">Your name</label>
              <input
                id="fc-compact-you"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                autoComplete="name"
                className="mt-1 min-h-12 w-full border border-line bg-surface px-3 outline-none focus-visible:border-accent"
              />
            </div>
          )}
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="fc-family-name" className="block text-sm font-medium text-ink">Circle name</label>
            <input
              id="fc-family-name"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="The Alvarez Circle"
              className="mt-1 min-h-12 w-full border border-line bg-surface px-3 text-base outline-none focus-visible:border-accent"
            />
          </div>
          <fieldset className="space-y-3">
            <legend className="text-sm font-bold text-ink">People in this circle</legend>
            <p className="text-sm leading-6 text-mute">
              Add yourself first. You can add grandparents, kids, and others — they don&apos;t need Google
              accounts yet.
            </p>
            {members.map((m, i) => (
              <div key={i} className="border border-line p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{m.isYou ? "You" : m.name.trim() || "Another person"}</p>
                  {members.length > 1 && !m.isYou ? (
                    <button
                      type="button"
                      className="text-sm text-mute underline-offset-2 hover:text-ink hover:underline"
                      onClick={() => setMembers((list) => list.filter((_, idx) => idx !== i))}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-sm text-mute" htmlFor={`fc-name-${i}`}>Full name</label>
                    <input
                      id={`fc-name-${i}`}
                      value={m.name}
                      onChange={(e) => update(i, { name: e.target.value })}
                      className="mt-1 min-h-12 w-full border border-line bg-surface px-3 text-base outline-none focus-visible:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-mute" htmlFor={`fc-role-${i}`}>Role</label>
                    <input
                      id={`fc-role-${i}`}
                      list="fc-family-roles"
                      value={m.role}
                      onChange={(e) => update(i, { role: e.target.value })}
                      className="mt-1 min-h-12 w-full border border-line bg-surface px-3 text-base outline-none focus-visible:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-mute" htmlFor={`fc-age-${i}`}>Age</label>
                    <input
                      id={`fc-age-${i}`}
                      type="number"
                      min={0}
                      max={120}
                      value={m.age}
                      onChange={(e) => update(i, { age: e.target.value })}
                      className="mt-1 min-h-12 w-full border border-line bg-surface px-3 text-base outline-none focus-visible:border-accent"
                    />
                  </div>
                  <AddressFields
                    idPrefix={`fc-member-${i}`}
                    value={m.address}
                    onChange={(address) => update(i, { address })}
                  />
                </div>
                <div className="mt-2 text-sm">
                  <label className="flex min-h-11 items-center gap-2">
                    <input
                      type="radio"
                      name="fc-is-you"
                      checked={youIndex === i}
                      onChange={() => update(i, { isYou: true })}
                    />
                    This is me
                  </label>
                </div>
              </div>
            ))}
            <datalist id="fc-family-roles">
              {ROLES.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
            <button
              type="button"
              onClick={() => setMembers((list) => [...list, emptyMember(false)])}
              className="min-h-12 w-full border border-dashed border-line text-sm font-medium text-accent hover:underline"
            >
              Add another person
            </button>
          </fieldset>
        </>
      )}

      {error ? (
        <p className="border border-line px-3 py-2 text-sm text-red-700" role="alert">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="min-h-12 w-full rounded-sm bg-ember text-sm font-semibold text-white hover:bg-ember-dark disabled:opacity-60"
      >
        {busy ? "Saving…" : submitLabel ?? defaultSubmit}
      </button>
    </form>
  );
}
