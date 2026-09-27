"use client";

import { demoAssignPatient, demoReleasePatient } from "@/lib/demo-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Action = "assign" | "release";

const RELEASE_REASONS = [
  { value: "transfer", label: "Transferring to another clinician" },
  { value: "discharge", label: "Patient no longer under my care" },
  { value: "patient-request", label: "Patient or family requested release" },
  { value: "coverage-gap", label: "Temporary coverage has ended" },
] as const;

type ReleaseReason = (typeof RELEASE_REASONS)[number]["value"];

const RELEASE_CONFIRM_TEXT = "RELEASE";

export function PatientAssignmentActions({
  memberId,
  action,
  label,
  patientName,
  compact = false,
  demo = false,
}: {
  memberId: string;
  action: Action;
  label: string;
  patientName?: string;
  compact?: boolean;
  demo?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState<ReleaseReason | "">("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!confirmOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        setConfirmOpen(false);
        setReason("");
        setAcknowledged(false);
        setConfirmText("");
        setError("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmOpen, busy]);

  useEffect(() => {
    document.body.style.overflow = confirmOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [confirmOpen]);

  function resetConfirm() {
    setReason("");
    setAcknowledged(false);
    setConfirmText("");
    setError("");
  }

  function closeConfirm() {
    if (busy) return;
    setConfirmOpen(false);
    resetConfirm();
  }

  async function assign() {
    if (busy) return;
    setBusy(true);
    setError("");
    if (demo) {
      demoAssignPatient(memberId);
      setCompleted(true);
      setBusy(false);
      return;
    }
    const response = await fetch("/api/clinical/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(result.error || "Could not update roster.");
      setBusy(false);
      return;
    }
    setBusy(false);
    router.refresh();
  }

  async function release() {
    if (busy || !reason) return;
    setBusy(true);
    setError("");
    if (demo) {
      demoReleasePatient(memberId);
      setCompleted(true);
      setBusy(false);
      setConfirmOpen(false);
      resetConfirm();
      return;
    }
    const response = await fetch("/api/clinical/assignments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, reason }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(result.error || "Could not update roster.");
      setBusy(false);
      return;
    }
    setBusy(false);
    setConfirmOpen(false);
    resetConfirm();
    router.refresh();
  }

  function onPrimaryClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (action === "assign") {
      assign();
      return;
    }
    setConfirmOpen(true);
  }

  const styles =
    action === "assign"
      ? "border-clinic bg-clinic text-white hover:bg-clinic/90"
      : "border-line bg-surface text-ink hover:bg-ground";

  const canConfirmRelease =
    Boolean(reason) && acknowledged && confirmText.trim().toUpperCase() === RELEASE_CONFIRM_TEXT;

  const displayName = patientName?.trim() || "this patient";

  return (
    <>
      <div className={compact ? "flex flex-col items-end gap-1" : "flex flex-col gap-2"}>
        <button
          type="button"
          onClick={onPrimaryClick}
          disabled={busy || completed}
          className={`rounded-sm border px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${styles}`}
        >
          {completed
            ? action === "assign"
              ? "On your roster"
              : "Released"
            : busy && action === "assign"
              ? "Saving…"
              : label}
        </button>
        {error && !confirmOpen ? <span className="text-xs text-rose-700" role="alert">{error}</span> : null}
      </div>

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-ground/95 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`release-roster-${memberId}`}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeConfirm();
          }}
        >
          <div
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto border border-line bg-surface"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-line bg-surface px-5 py-4">
              <h2 id={`release-roster-${memberId}`} className="text-base font-semibold text-ink">
                Release {displayName} from your roster?
              </h2>
              <p className="mt-2 text-sm text-mute">
                You won&apos;t see their trend history or pre-visit briefs until someone else adds them or you add
                them again.
              </p>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div>
                <label htmlFor={`release-reason-${memberId}`} className="text-sm font-semibold text-ink">
                  Reason for release
                </label>
                <select
                  id={`release-reason-${memberId}`}
                  value={reason}
                  disabled={busy}
                  onChange={(event) => setReason(event.target.value as ReleaseReason | "")}
                  className="mt-2 w-full min-h-10 rounded-sm border border-line bg-surface px-3 text-sm text-ink"
                >
                  <option value="">Select a reason…</option>
                  {RELEASE_REASONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-start gap-3 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  disabled={busy}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  I understand {displayName} will leave my panel and their care may need a handoff.
                </span>
              </label>

              <div>
                <label htmlFor={`release-confirm-${memberId}`} className="text-sm font-semibold text-ink">
                  Type <span className="font-mono">{RELEASE_CONFIRM_TEXT}</span> to confirm
                </label>
                <input
                  id={`release-confirm-${memberId}`}
                  type="text"
                  value={confirmText}
                  disabled={busy}
                  onChange={(event) => setConfirmText(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  className="mt-2 w-full min-h-10 rounded-sm border border-line bg-surface px-3 text-sm text-ink"
                />
              </div>

              {error ? <p className="text-sm text-rose-700" role="alert">{error}</p> : null}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeConfirm}
                disabled={busy}
                className="min-h-10 rounded-sm border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-ground disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={release}
                disabled={busy || !canConfirmRelease}
                className="min-h-10 rounded-sm border border-rose-300 bg-rose-50 px-4 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-60"
              >
                {busy ? "Releasing…" : "Release from roster"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
