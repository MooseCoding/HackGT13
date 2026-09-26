"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type DraftMember = {
  name: string;
  role: string;
  age: string;
  location: string;
  clinicalOptIn: boolean;
  isYou: boolean;
};

const ROLES = ["Grandparent", "Parent", "Partner", "Child", "Grandchild", "Aunt/Uncle", "Family"];

function emptyMember(isYou = false, name = ""): DraftMember {
  return { name, role: isYou ? "Me" : "Family", age: "", location: "", clinicalOptIn: false, isYou };
}

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
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
    if (!familyName.trim()) {
      setError("Name your family circle so everyone knows they’re home.");
      return;
    }
    const filled = members.filter((m) => m.name.trim());
    if (filled.length < 1) {
      setError("Add yourself, then anyone else you want in the circle.");
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
          location: m.location,
          clinicalOptIn: m.clinicalOptIn,
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
              <div className="sm:col-span-2">
                <label className="block text-sm text-mute" htmlFor={`loc-${i}`}>
                  Location (optional)
                </label>
                <input
                  id={`loc-${i}`}
                  value={m.location}
                  onChange={(e) => update(i, { location: e.target.value })}
                  className="mt-1 min-h-12 w-full rounded-lg border border-line px-3 text-base outline-none focus-visible:border-ember focus-visible:ring-2 focus-visible:ring-ember/30"
                />
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="radio"
                  name="is-you"
                  checked={youIndex === i}
                  onChange={() => update(i, { isYou: true })}
                />
                This is me
              </label>
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={m.clinicalOptIn}
                  onChange={(e) => update(i, { clinicalOptIn: e.target.checked })}
                />
                Opt in to clinician view (optional)
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
        {busy ? "Saving…" : "Continue to Hearth"}
      </button>
    </form>
  );
}
