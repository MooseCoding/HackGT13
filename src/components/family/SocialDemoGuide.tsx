"use client";

import { useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";

const DISMISS_KEY = "hearth-social-demo-dismissed";

function subscribeDismiss(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener("hearth-social-demo-dismiss", handler);
  return () => window.removeEventListener("hearth-social-demo-dismiss", handler);
}

function readDismissed() {
  return localStorage.getItem(DISMISS_KEY) === "1";
}

/** One-line note for the social-good demo path (?demo=social). */
export function SocialDemoGuide() {
  const searchParams = useSearchParams();
  const dismissed = useSyncExternalStore(subscribeDismiss, readDismissed, () => false);

  if (searchParams.get("demo") !== "social" || dismissed) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    window.dispatchEvent(new Event("hearth-social-demo-dismiss"));
  }

  return (
    <div className="mx-3 mb-2 flex items-center justify-between gap-3 border border-rule bg-accent-tint px-3 py-2">
      <p className="text-sm text-ink">
        Try mutual aid, conversation starters, check-in, or supply hints in chat.
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 text-sm text-mute hover:text-ink"
        aria-label="Dismiss demo note"
      >
        Dismiss
      </button>
    </div>
  );
}
