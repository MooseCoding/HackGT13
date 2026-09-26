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

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [inviteCode, setInviteCode] = useState("");
  const [memberName, setMemberName] = useState(defaultName);
  const [familyName, setFamilyName] = useState("");
  const [members, setMembers] = useState<DraftMember[]>([emptyMember(true, defaultName)]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const youIndex = useMemo(() => members.findIndex((m) => m.isYou), [members]);

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
        body: JSON.stringify({ mode, inviteCode, memberName }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not join this family.");
        setBusy(false);
        return;
      }
      router.push("/family");
      router.refresh();
      return;
    }
    if (!familyName.trim()) {
      setError("Name your family circle so everyone knows they’re home.");
      return;
    }
    const filled = members.filter((m) => m.name.trim());
    if (filled.length < 1) {
      setError("Add yourself, then anyone else you want in the circle.");
      return;
    }
    const missingAddress = filled.find((m) => !m.address.street.trim() || !m.address.city.trim());
    if (missingAddress) {
      setError(`Add a street and city for ${missingAddress.name.trim() || "each person"}.`);
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
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Could not save.");
      setBusy(false);
      return;
    }
    router.push("/family");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <div className="grid grid-cols-2 rounded-lg border border-line bg-paper p-1" role="group" aria-label="Family setup choice">
        <button
          type="button"
          onClick={() => setMode("create")}
          className={`min-h-11 rounded-md text-sm font-semibold ${mode === "create" ? "bg-ember text-white" : "text-mute"}`}
        >
          Create a circle
        </button>
        <button
          type="button"
          onClick={() => setMode("join")}
          className={`min-h-11 rounded-md text-sm font-semibold ${mode === "join" ? "bg-ember text-white" : "text-mute"}`}
        >
          Join a circle
        </button>
      </div>

      {mode === "join" ? (
        <div className="space-y-4 rounded-xl border border-line bg-paper p-4">
          <p className="text-sm leading-6 text-mute">
            Ask the family organizer for the invite code. Your name must match the profile they created for you.
          </p>
          <div>
            <label htmlFor="invite-code" className="block text-sm font-medium">Invite code</label>
            <input
              id="invite-code"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              placeholder="ALVAREZ42"
              autoCapitalize="characters"
              className="mt-1 min-h-12 w-full rounded-lg border border-line px-3 font-mono uppercase outline-none focus-visible:border-ember"
            />
          </div>
          <div>
            <label htmlFor="member-name" className="block text-sm font-medium">Your full name</label>
            <input
              id="member-name"
              value={memberName}
              onChange={(event) => setMemberName(event.target.value)}
              className="mt-1 min-h-12 w-full rounded-lg border border-line px-3 outline-none focus-visible:border-ember"
            />
          </div>
        </div>
      ) : (
        <>
      <div>
        <label htmlFor="family-name" className="block text-sm font-medium text-ink">
          Family name
        </label>
        <input
          id="family-name"
          name="familyName"
          autoComplete="organization"
          required
          value={familyName}
          onChange={(e) => setFamilyName(e.target.value)}
          placeholder="The Alvarez Circle"
          className="mt-1 min-h-12 w-full rounded-lg border border-line bg-paper px-3 text-base text-ink outline-none focus-visible:border-ember focus-visible:ring-2 focus-visible:ring-ember/30"
        />
      </div>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-ink">People in this circle</legend>
        <p className="text-sm leading-6 text-mute">
          Add yourself first. You can add grandparents, kids, and others — they don’t need Google
          accounts yet.
        </p>
        {members.map((m, i) => (
          <div key={i} className="rounded-xl border border-line bg-paper p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{m.isYou ? "You" : `Member ${i + 1}`}</p>
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
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm text-mute" htmlFor={`name-${i}`}>
                  Full name
                </label>
                <input
                  id={`name-${i}`}
                  required
                  autoComplete={m.isYou ? "name" : "off"}
                  value={m.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  className="mt-1 min-h-12 w-full rounded-lg border border-line px-3 text-base outline-none focus-visible:border-ember focus-visible:ring-2 focus-visible:ring-ember/30"
                />
              </div>
              <div>
                <label className="block text-sm text-mute" htmlFor={`role-${i}`}>
                  Role
                </label>
                <input
                  id={`role-${i}`}
                  list="family-roles"
                  value={m.role}
                  onChange={(e) => update(i, { role: e.target.value })}
                  className="mt-1 min-h-12 w-full rounded-lg border border-line px-3 text-base outline-none focus-visible:border-ember focus-visible:ring-2 focus-visible:ring-ember/30"
                />
              </div>
              <div>
                <label className="block text-sm text-mute" htmlFor={`age-${i}`}>
                  Age
                </label>
                <input
                  id={`age-${i}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={120}
                  value={m.age}
                  onChange={(e) => update(i, { age: e.target.value })}
                  className="mt-1 min-h-12 w-full rounded-lg border border-line px-3 text-base outline-none focus-visible:border-ember focus-visible:ring-2 focus-visible:ring-ember/30"
                />
              </div>
              <AddressFields
                idPrefix={`member-${i}`}
                value={m.address}
                onChange={(address) => update(i, { address })}
              />
            </div>
            <div className="mt-3 text-sm">
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="radio"
                  name="is-you"
                  checked={youIndex === i}
                  onChange={() => update(i, { isYou: true })}
                />
                This is me
              </label>
            </div>
          </div>
        ))}
        <datalist id="family-roles">
          {ROLES.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
        <button
          type="button"
          onClick={() => setMembers((list) => [...list, emptyMember(false)])}
          className="min-h-12 w-full rounded-lg border border-dashed border-line text-sm font-medium text-ember hover:border-ember focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
        >
          Add another person
        </button>
      </fieldset>
        </>
      )}

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="min-h-12 w-full rounded-lg bg-ember text-base font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-dark disabled:opacity-60"
      >
        {busy ? "Saving…" : mode === "join" ? "Join family circle" : "Continue to Hearth"}
      </button>
    </form>
  );
}
