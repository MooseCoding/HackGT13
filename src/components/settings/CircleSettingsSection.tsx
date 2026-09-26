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
      <section className="px-4 py-4" aria-labelledby="settings-circle-heading">
        <label className="block" htmlFor="settings-circle">
          <h3 id="settings-circle-heading" className="text-sm font-semibold text-ink">Circle</h3>
          <p className="mt-1 text-sm text-mute">
            Chats, calendar, and Hestia follow the circle you choose.
          </p>
          <select
            id="settings-circle"
            value={selectValue}
            disabled={switching}
            onChange={(e) => onSelectChange(e.target.value)}
            className="mt-2 min-h-11 w-full border border-rule bg-paper px-3 py-2 text-sm text-ink disabled:opacity-60"
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
          <p id="settings-circle-error" className="mt-2 border border-rule px-3 py-2 text-xs text-red-700" role="alert">
            {switchError}
          </p>
        ) : null}

        <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={autoAddCalls}
            disabled={autoAddBusy}
            onChange={(e) => void updateAutoAddCalls(e.target.checked)}
            className="mt-1"
            aria-describedby="settings-auto-calls-desc"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-ink">Auto-add family calls</span>
            <span id="settings-auto-calls-desc" className="mt-0.5 block text-sm text-mute">
              When on, Hearth places family calls on the calendar using your call rhythm — no extra step needed.
            </span>
          </span>
        </label>

        {autoAddError ? (
          <p className="mt-2 border border-rule px-3 py-2 text-xs text-red-700" role="alert">
            {autoAddError}
          </p>
        ) : null}
      </section>

      {modal ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="circle-settings-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto border border-rule bg-surface">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-rule bg-surface px-4 py-3">
              <div>
                <h2 id="circle-settings-modal-title" className="text-lg font-semibold text-ink">
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
                className="min-h-10 shrink-0 px-2 text-sm text-mute hover:text-ink hover:underline"
              >
                Close
              </button>
            </div>
            <div className="p-4">
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
