"use client";

import { FamilyCircleForm } from "@/components/family/FamilyCircleForm";
import type { Family } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const JOIN_VALUE = "__join__";
const CREATE_VALUE = "__create__";

export function CircleSettingsSection({
  families,
  activeFamilyId,
  activeFamilyName,
  autoAddFamilyCalls = true,
  defaultName,
}: {
  families: Family[];
  activeFamilyId: string;
  activeFamilyName: string;
  autoAddFamilyCalls?: boolean;
  defaultName?: string;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<"join" | "create" | null>(null);
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [selectValue, setSelectValue] = useState(activeFamilyId);
  const activeAutoAddDefault =
    families.find((f) => f.id === activeFamilyId)?.autoAddFamilyCalls ?? autoAddFamilyCalls;
  const [autoAddCalls, setAutoAddCalls] = useState(activeAutoAddDefault);
  const [autoAddBusy, setAutoAddBusy] = useState(false);
  const [autoAddError, setAutoAddError] = useState<string | null>(null);

  useEffect(() => {
    setSelectValue(activeFamilyId);
  }, [activeFamilyId]);

  useEffect(() => {
    setAutoAddCalls(activeAutoAddDefault);
  }, [activeFamilyId, activeAutoAddDefault]);

  const closeModal = useCallback(() => {
    setModal(null);
    setSwitchError(null);
    setSelectValue(activeFamilyId);
  }, [activeFamilyId]);

  useEffect(() => {
    if (!modal) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") closeModal();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modal, closeModal]);

  useEffect(() => {
    document.body.style.overflow = modal ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modal]);

  async function switchFamily(familyId: string) {
    if (familyId === activeFamilyId) return;
    setSwitchError(null);
    setSwitching(true);
    try {
      const res = await fetch("/api/families/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSwitchError(json.error || "Could not switch circles. Try again or pick a different circle.");
        setSelectValue(activeFamilyId);
        return;
      }
      router.refresh();
    } finally {
      setSwitching(false);
    }
  }

  function onSelectChange(value: string) {
    if (value === JOIN_VALUE) {
      setSwitchError(null);
      setModal("join");
      setSelectValue(activeFamilyId);
      return;
    }
    if (value === CREATE_VALUE) {
      setSwitchError(null);
      setModal("create");
      setSelectValue(activeFamilyId);
      return;
    }
    setSelectValue(value);
    void switchFamily(value);
  }

  function onFormSuccess() {
    setModal(null);
    router.refresh();
  }

  async function updateAutoAddCalls(enabled: boolean) {
    setAutoAddError(null);
    setAutoAddCalls(enabled);
    setAutoAddBusy(true);
    try {
      const res = await fetch("/api/families/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId: activeFamilyId, autoAddFamilyCalls: enabled }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAutoAddCalls(activeAutoAddDefault);
        setAutoAddError(json.error || "Could not save that setting. Try again.");
        return;
      }
      router.refresh();
    } finally {
      setAutoAddBusy(false);
    }
  }

  if (families.length === 0) return null;

  return (
    <>
      <section className="px-4 py-5" aria-labelledby="settings-circle-heading">
        <div className="mb-3">
          <h3 id="settings-circle-heading" className="text-xs font-semibold uppercase tracking-[0.12em] text-mute">
            Circle
          </h3>
          <p className="mt-1 text-sm text-mute">Messages, calendar, and Hestia follow whichever circle you pick.</p>
        </div>

        <div className="space-y-2">
          <div className="rounded-xl border border-rule bg-paper px-4 py-3.5 shadow-sm shadow-black/[0.03]">
            <label className="block" htmlFor="settings-circle">
              <span className="block text-sm font-medium text-ink">Active circle</span>
              <span className="mt-0.5 block text-sm text-mute">{activeFamilyName}</span>
              <select
                id="settings-circle"
                value={selectValue}
                disabled={switching}
                onChange={(e) => onSelectChange(e.target.value)}
                className="mt-3 min-h-11 w-full rounded-lg border border-rule bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors hover:border-ink/25 focus:border-ember disabled:opacity-60"
                aria-describedby={switchError ? "settings-circle-error" : undefined}
              >
                {families.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                    {f.id === activeFamilyId ? " (current)" : ""}
                  </option>
                ))}
                <option disabled>──────────</option>
                <option value={JOIN_VALUE}>Join with code</option>
                <option value={CREATE_VALUE}>Create new circle</option>
              </select>
            </label>

            {switching ? (
              <p className="mt-2 text-xs text-mute">Switching…</p>
            ) : null}

            {switchError ? (
              <p
                id="settings-circle-error"
                className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                role="alert"
              >
                {switchError}
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-rule bg-paper px-4 py-3.5 shadow-sm shadow-black/[0.03]">
            <div className="flex items-center justify-between gap-4">
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">Auto-add family calls</span>
                <span id="settings-auto-calls-desc" className="mt-0.5 block text-sm text-mute">
                  When this is on, Familyr puts family calls on the calendar based on your call rhythm. No extra click.
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={autoAddCalls}
                aria-describedby="settings-auto-calls-desc"
                disabled={autoAddBusy}
                onClick={() => void updateAutoAddCalls(!autoAddCalls)}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                  autoAddCalls ? "bg-ember" : "bg-rule"
                } ${autoAddBusy ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    autoAddCalls ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {autoAddError ? (
              <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
                {autoAddError}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {modal ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-[var(--overlay)] p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="circle-settings-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="landing-rise flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-rule bg-surface shadow-2xl shadow-black/10 sm:max-h-[90dvh] sm:rounded-2xl">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-rule px-5 py-4">
              <div>
                <h2 id="circle-settings-modal-title" className="text-lg font-semibold tracking-tight text-ink">
                  {modal === "join" ? "Join a circle" : "Create a circle"}
                </h2>
                <p className="mt-0.5 text-sm text-mute">
                  {modal === "join"
                    ? "You'll switch to this circle after joining."
                    : "You'll switch to the new circle when it's ready."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-mute transition-colors hover:bg-accent-tint hover:text-ink"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                  <path
                    d="M4.5 4.5l9 9M13.5 4.5l-9 9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <FamilyCircleForm
                defaultName={defaultName}
                redirectOnSuccess={false}
                onSuccess={onFormSuccess}
                variant="compact"
                initialMode={modal}
                hideModeToggle
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
