"use client";

import { useFamily } from "@/components/family/FamilyChrome";
import {
  INSURANCE_CARRIERS,
  carrierLabel,
  inNetworkCliniciansForInsurance,
} from "@/lib/clinical/insurance";
import { demoSaveInsurance } from "@/lib/demo-client";
import type { MemberInsurance } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function InsuranceSettings({
  demo = false,
  lockedMemberId,
}: {
  demo?: boolean;
  lockedMemberId?: string;
}) {
  const router = useRouter();
  const { members, me } = useFamily();
  const [memberId, setMemberId] = useState(lockedMemberId ?? me.id);
  const member = members.find((candidate) => candidate.id === memberId) ?? me;
  const [carrierId, setCarrierId] = useState(member.insurance?.carrierId ?? "");
  const [policyMemberId, setPolicyMemberId] = useState(member.insurance?.policyMemberId ?? "");
  const [groupId, setGroupId] = useState(member.insurance?.groupId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedInsurance, setSavedInsurance] = useState<MemberInsurance | undefined>(member.insurance);

  useEffect(() => {
    setMemberId(lockedMemberId ?? me.id);
  }, [lockedMemberId, me.id]);

  useEffect(() => {
    setCarrierId(member.insurance?.carrierId ?? "");
    setPolicyMemberId(member.insurance?.policyMemberId ?? "");
    setGroupId(member.insurance?.groupId ?? "");
    setSavedInsurance(member.insurance);
    setError(null);
  }, [member.id, member.insurance]);

  const previewInsurance = useMemo(
    () => (carrierId ? { carrierId, policyMemberId: policyMemberId || undefined, groupId: groupId || undefined } : undefined),
    [carrierId, policyMemberId, groupId],
  );
  const matchedClinicians = inNetworkCliniciansForInsurance(previewInsurance);

  async function saveInsurance() {
    if (!memberId || busy) return;
    setBusy(true);
    setError(null);
    const insurance = carrierId
      ? {
          carrierId,
          policyMemberId: policyMemberId.trim() || undefined,
          groupId: groupId.trim() || undefined,
        }
      : null;
    if (demo) {
      demoSaveInsurance(memberId, insurance);
      setSavedInsurance(insurance ?? undefined);
      setBusy(false);
      return;
    }
    const res = await fetch("/api/insurance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, insurance }),
    });
    setBusy(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || "Could not save insurance.");
      return;
    }
    const json = await res.json();
    setSavedInsurance(json.member?.insurance);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/family"
        className="inline-flex min-h-11 items-center text-sm font-medium text-clinic underline-offset-4 hover:underline"
      >
        Back to family
      </Link>

      <header className="mt-4 border-b border-line pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mute">Settings</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Insurance</h1>
        <p className="mt-3 max-w-xl text-base leading-7 text-mute">
          Add coverage for a family member so Hearth can match them with in-network clinicians when they appear in
          the care-team portal.
        </p>
      </header>

      {demo && !lockedMemberId ? (
        <section className="mt-6 border border-line bg-surface px-4 py-4">
          <label className="block text-sm font-semibold text-ink" htmlFor="insurance-member">
            Family member
          </label>
          <select
            id="insurance-member"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="mt-2 min-h-11 w-full border border-line bg-ground px-3 text-sm text-ink"
          >
            {members.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name} · {candidate.role}
              </option>
            ))}
          </select>
        </section>
      ) : null}

      <section className="mt-8 border border-line bg-surface px-4 py-5">
        <h2 className="text-sm font-semibold text-ink">Coverage details</h2>
        <p className="mt-2 text-sm text-mute">
          Demo only — stored locally for this session. Real eligibility checks would run against a payer API.
        </p>

        <div className="mt-5 space-y-4">
          <label className="block text-sm text-ink">
            <span className="font-medium">Insurance carrier</span>
            <select
              value={carrierId}
              onChange={(e) => setCarrierId(e.target.value)}
              className="mt-2 min-h-11 w-full border border-line bg-ground px-3 text-sm"
            >
              <option value="">Select a carrier</option>
              {INSURANCE_CARRIERS.map((carrier) => (
                <option key={carrier.id} value={carrier.id}>
                  {carrier.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-ink">
            <span className="font-medium">Member ID</span>
            <input
              value={policyMemberId}
              onChange={(e) => setPolicyMemberId(e.target.value)}
              placeholder="Policy or Medicare number"
              className="mt-2 min-h-11 w-full border border-line bg-ground px-3 text-sm"
            />
          </label>

          <label className="block text-sm text-ink">
            <span className="font-medium">Group ID</span>
            <span className="text-mute"> (optional)</span>
            <input
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              placeholder="GRP-0000"
              className="mt-2 min-h-11 w-full border border-line bg-ground px-3 text-sm"
            />
          </label>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={saveInsurance}
          disabled={busy || !carrierId}
          className="mt-5 min-h-11 rounded-sm bg-ember px-4 text-sm font-semibold text-white hover:bg-ember/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save insurance"}
        </button>
      </section>

      {previewInsurance ? (
        <section className="mt-6 border border-emerald-200 bg-emerald-50 px-4 py-5" aria-live="polite">
          <h2 className="text-sm font-semibold text-emerald-950">In-network clinicians</h2>
          <p className="mt-2 text-sm leading-6 text-emerald-950/90">
            {matchedClinicians.length
              ? `${member.name} is matched to ${matchedClinicians.length} in-network PCP${
                  matchedClinicians.length === 1 ? "" : "s"
                } for ${carrierLabel(previewInsurance)}.`
              : `No demo clinicians accept ${carrierLabel(previewInsurance)} yet. Try Blue Cross, Medicare, or UnitedHealthcare.`}
          </p>
          {matchedClinicians.length ? (
            <ul className="mt-4 space-y-2">
              {matchedClinicians.map((clinician) => (
                <li
                  key={clinician.id}
                  className="flex items-center justify-between gap-3 border border-emerald-200/80 bg-white/70 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-semibold text-ink">{clinician.name}</p>
                    <p className="text-xs text-mute">{clinician.specialty}</p>
                  </div>
                  <span className="shrink-0 rounded-sm border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
                    In network
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {savedInsurance?.carrierId === carrierId ? (
            <p className="mt-4 text-xs text-emerald-900/80">
              Saved. When clinician sharing is on, these matches appear on the available patients list.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
