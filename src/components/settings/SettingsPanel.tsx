"use client";

import { useSettingsActions } from "@/components/settings/SettingsProvider";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const TIMEZONES = [
  { value: "auto", label: "Auto (device)" },
  { value: "America/New_York", label: "Eastern" },
  { value: "America/Chicago", label: "Central" },
  { value: "America/Denver", label: "Mountain" },
  { value: "America/Los_Angeles", label: "Pacific" },
  { value: "UTC", label: "UTC" },
] as const;

export function SettingsMenu({
  signedIn,
  userDisplayName,
}: {
  signedIn: boolean;
  userDisplayName?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const { theme, setTheme, largerText, setLargerText, timezone, setTimezone } = useSettingsActions();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="min-h-11 rounded-sm border border-chrome-border px-3 text-sm text-chrome-fg hover:bg-white/10"
      >
        Settings
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Settings"
          className="absolute right-0 z-40 mt-2 w-72 border border-rule bg-surface p-4 text-ink shadow-sm"
        >
          {signedIn && userDisplayName ? (
            <p className="mb-3 truncate text-sm text-mute">
              Signed in as <span className="font-medium text-ink">{userDisplayName}</span>
            </p>
          ) : null}

          <label className="block text-sm">
            <span className="font-medium">Theme</span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")}
              className="mt-1 min-h-11 w-full rounded-sm border border-rule bg-surface px-3 text-sm"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">Match device</option>
            </select>
          </label>

          <label className="mt-3 block text-sm">
            <span className="font-medium">Time zone</span>
            <select
              value={timezone ?? "auto"}
              onChange={(e) => setTimezone(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-sm border border-rule bg-surface px-3 text-sm"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={largerText}
              onChange={(e) => setLargerText(e.target.checked)}
              className="h-4 w-4 accent-[var(--ember)]"
            />
            <span className="font-medium">Larger text</span>
          </label>

          {signedIn ? (
            <button
              type="button"
              onClick={() => void signOut()}
              disabled={signingOut}
              className="mt-4 min-h-11 w-full rounded-sm border border-rule px-3 text-sm font-medium text-ink hover:border-ink disabled:opacity-60"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
