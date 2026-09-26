"use client";

import { FamilyCircleForm } from "@/components/family/FamilyCircleForm";
import type { Family } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

function shortFamilyName(name: string) {
  const trimmed = name.replace(/^the\s+/i, "").trim();
  if (trimmed.length <= 18) return trimmed;
  return `${trimmed.slice(0, 16)}…`;
}

export function FamilyCircleSwitcher({
  families,
  activeFamilyId,
  activeFamilyName,
  defaultName,
}: {
  families: Family[];
  activeFamilyId: string;
  activeFamilyName: string;
  defaultName?: string;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<"join" | "create" | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeAll = useCallback(() => {
    setMenuOpen(false);
    setModal(null);
    setSwitchError(null);
  }, []);

  useEffect(() => {
    if (!menuOpen && !modal) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") closeAll();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen, modal, closeAll]);

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(ev: MouseEvent) {
      const target = ev.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setMenuOpen(false);
      setSwitchError(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  useEffect(() => {
    document.body.style.overflow = modal ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modal]);

  async function switchFamily(familyId: string) {
    if (familyId === activeFamilyId) {
      setMenuOpen(false);
      return;
    }
    setSwitchError(null);
    setSwitchingId(familyId);
    try {
      const res = await fetch("/api/families/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSwitchError(json.error || "Could not switch circles. Try again or pick a different circle.");
        return;
      }
      setMenuOpen(false);
      router.refresh();
    } finally {
      setSwitchingId(null);
    }
  }

  function openModal(kind: "join" | "create") {
    setMenuOpen(false);
    setSwitchError(null);
    setModal(kind);
  }

  function onFormSuccess() {
    setModal(null);
    router.refresh();
  }

  const otherCount = families.length - 1;

  return (
    <>
      <div className="relative shrink-0" ref={rootRef}>
        <button
          type="button"
          onClick={() => {
            setMenuOpen((v) => !v);
            setSwitchError(null);
          }}
          className={`flex min-h-11 items-center gap-2 rounded-sm border px-2.5 py-1.5 text-left sm:px-3 ${
            menuOpen
              ? "border-ember bg-white/10 text-white"
              : "border-white/30 bg-transparent text-white hover:border-white"
          }`}
          aria-expanded={menuOpen}
          aria-haspopup="listbox"
          aria-label={`Current circle: ${activeFamilyName}. ${otherCount > 0 ? `${otherCount} more available.` : ""} Switch circle.`}
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-ember text-xs font-bold text-white"
            aria-hidden
          >
            {activeFamilyName.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 max-w-[7.5rem] truncate text-sm font-semibold leading-tight sm:max-w-[10rem]">
            {shortFamilyName(activeFamilyName)}
          </span>
          <span className="shrink-0 text-white/60" aria-hidden>{menuOpen ? "▴" : "▾"}</span>
        </button>

        {menuOpen ? (
          <div
            ref={menuRef}
            className="fixed inset-x-3 top-[3.25rem] z-50 overflow-hidden border border-rule bg-surface sm:absolute sm:inset-x-auto sm:left-0 sm:top-[calc(100%+0.375rem)] sm:w-80"
            role="listbox"
            aria-label="Family circles"
          >
            <div className="border-b border-rule px-3 py-2.5">
              <p className="text-sm font-semibold text-ink">Your circles</p>
              <p className="text-xs text-mute">Chats, calendar, and Hestia switch with the active circle.</p>
            </div>

            <div className="max-h-[min(40dvh,16rem)] overflow-y-auto p-1.5">
              {families.map((f) => {
                const active = f.id === activeFamilyId;
                const switching = switchingId === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    disabled={Boolean(switchingId)}
                    onClick={() => switchFamily(f.id)}
                    className={`flex w-full min-h-12 items-center gap-2.5 px-3 py-2 text-left text-sm ${
                      active
                        ? "bg-accent-tint font-semibold text-ink"
                        : "text-ink hover:bg-accent-tint disabled:opacity-60"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center border border-rule text-xs font-bold ${
                        active ? "bg-ink text-white" : "text-mute"
                      }`}
                      aria-hidden
                    >
                      {f.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{f.name}</span>
                      {f.tagline ? (
                        <span className="block truncate text-xs font-normal text-mute">{f.tagline}</span>
                      ) : null}
                    </span>
                    {switching ? (
                      <span className="shrink-0 text-xs text-mute">Switching…</span>
                    ) : active ? (
                      <span className="shrink-0 text-ink" aria-label="Active">✓</span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {switchError ? (
              <p className="mx-3 mb-2 border border-rule px-3 py-2 text-xs text-red-700" role="alert">
                {switchError}
              </p>
            ) : null}

            <div className="space-y-1 border-t border-rule p-1.5">
              <button
                type="button"
                onClick={() => openModal("join")}
                className="flex w-full min-h-11 items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-accent-tint"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-rule text-sm" aria-hidden>
                  #
                </span>
                <span>
                  <span className="block font-medium">Join with code</span>
                  <span className="block text-xs text-mute">Someone invited you</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => openModal("create")}
                className="flex w-full min-h-11 items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-accent-tint"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-rule text-sm text-ink" aria-hidden>
                  +
                </span>
                <span>
                  <span className="block font-medium">Create new circle</span>
                  <span className="block text-xs text-mute">Another household</span>
                </span>
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {modal ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="family-circle-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAll();
          }}
        >
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto border border-rule bg-surface">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-rule bg-surface px-4 py-3">
              <div>
                <h2 id="family-circle-modal-title" className="text-lg font-semibold text-ink">
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
                onClick={closeAll}
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
