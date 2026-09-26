"use client";

import { CircleSettingsSection } from "@/components/settings/CircleSettingsSection";
import { useSettings } from "@/components/settings/SettingsProvider";
import { SETTING_META, type HearthSettings, type SettingKey } from "@/lib/settings";
import type { Family } from "@/lib/types";
import {
  COMMON_TIMEZONES,
  TIMEZONE_AUTO,
  formatTimezoneLabel,
  getDeviceTimezone,
  readGeoTimezone,
  refreshGeoTimezone,
} from "@/lib/timezone";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="2.25" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M9 1.75v1.5M9 14.75v1.5M1.75 9h1.5M14.75 9h1.5M3.7 3.7l1.06 1.06M13.24 13.24l1.06 1.06M3.7 14.3l1.06-1.06M13.24 4.76l1.06-1.06"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SettingsMenu({
  signedIn = false,
  userDisplayName,
  showClinicalSharing = false,
  clinicalOptIn = false,
  compact = false,
  families = [],
  activeFamilyId,
  activeFamilyName,
  autoAddFamilyCalls = true,
}: {
  signedIn?: boolean;
  userDisplayName?: string;
  showClinicalSharing?: boolean;
  clinicalOptIn?: boolean;
  compact?: boolean;
  families?: Family[];
  activeFamilyId?: string;
  activeFamilyName?: string;
  autoAddFamilyCalls?: boolean;
}) {
  const { open, setOpen } = useSettings();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex min-h-11 items-center justify-center rounded-sm border border-chrome-border text-sm font-medium text-chrome-fg hover:border-chrome-fg ${
          compact ? "gap-1.5 px-2.5 sm:px-3" : "px-3"
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Settings"
      >
        {compact ? (
          <>
            <SettingsIcon className="sm:hidden" />
            <span className="hidden sm:inline">Settings</span>
          </>
        ) : (
          "Settings"
        )}
      </button>
      {open ? (
        <SettingsPanel
          onClose={() => setOpen(false)}
          signedIn={signedIn}
          userDisplayName={userDisplayName}
          showClinicalSharing={showClinicalSharing}
          clinicalOptIn={clinicalOptIn}
          families={families}
          activeFamilyId={activeFamilyId}
          activeFamilyName={activeFamilyName}
          autoAddFamilyCalls={autoAddFamilyCalls}
        />
      ) : null}
    </>
  );
}

function SettingsPanel({
  onClose,
  signedIn,
  userDisplayName,
  showClinicalSharing,
  clinicalOptIn,
  families = [],
  activeFamilyId,
  activeFamilyName,
  autoAddFamilyCalls = true,
}: {
  onClose: () => void;
  signedIn: boolean;
  userDisplayName?: string;
  showClinicalSharing: boolean;
  clinicalOptIn: boolean;
  families?: Family[];
  activeFamilyId?: string;
  activeFamilyName?: string;
  autoAddFamilyCalls?: boolean;
}) {
  const { settings, setSetting } = useSettings();
  const router = useRouter();
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoTimezone, setGeoTimezone] = useState<string | null>(() => readGeoTimezone());
  const deviceTimezone = useMemo(() => getDeviceTimezone(), []);

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setGeoBusy(true);
    void refreshGeoTimezone().then((tz) => {
      if (cancelled) return;
      setGeoBusy(false);
      if (tz) {
        setGeoTimezone(tz);
        window.dispatchEvent(new Event("hearth-geo-timezone"));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const timezoneOptions = useMemo(() => {
    const autoLabel = geoTimezone
      ? `Auto — ${formatTimezoneLabel(geoTimezone)} (location)`
      : `Auto — ${formatTimezoneLabel(deviceTimezone)} (device)`;
    const zones = new Set<string>([deviceTimezone, geoTimezone ?? "", ...COMMON_TIMEZONES]);
    zones.delete("");
    return [
      { value: TIMEZONE_AUTO, label: autoLabel },
      ...Array.from(zones)
        .sort()
        .map((tz) => ({ value: tz, label: formatTimezoneLabel(tz) })),
    ];
  }, [deviceTimezone, geoTimezone]);

  const GROUP_ORDER = ["Accessibility", "Display", "Regional", "Hestia"];

  const groups = Object.entries(SETTING_META).reduce<Record<string, SettingKey[]>>((acc, [key, meta]) => {
    acc[meta.group] = acc[meta.group] ?? [];
    acc[meta.group].push(key as SettingKey);
    return acc;
  }, {});

  const orderedGroups = GROUP_ORDER.filter((g) => groups[g]?.length).map((g) => [g, groups[g]!] as const);

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    onClose();
    router.push("/");
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--overlay)] p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto border border-rule bg-surface">
        <header className="flex items-start justify-between gap-3 border-b border-rule px-4 py-3">
          <div>
            <h2 id="settings-title" className="text-lg font-semibold text-ink">Settings</h2>
            <p className="mt-0.5 text-sm text-mute">Your preferences on this device.</p>
          </div>
          <button type="button" onClick={onClose} className="min-h-11 px-2 text-sm text-mute hover:text-ink">
            Close
          </button>
        </header>

        <div className="divide-y divide-rule">
          {families && families.length > 0 && activeFamilyId && activeFamilyName ? (
            <CircleSettingsSection
              families={families}
              activeFamilyId={activeFamilyId}
              activeFamilyName={activeFamilyName}
              autoAddFamilyCalls={autoAddFamilyCalls}
              defaultName={userDisplayName}
            />
          ) : null}

          {orderedGroups.map(([group, keys]) => (
            <section key={group} className="px-4 py-4" aria-labelledby={`settings-group-${group}`}>
              <h3 id={`settings-group-${group}`} className="text-sm font-semibold text-ink">
                {group}
              </h3>
              <ul className="mt-3 space-y-4">
                {keys.map((key) => {
                  const meta = SETTING_META[key];
                  const value = settings[key];

                  if (meta.control.type === "boolean" && typeof value === "boolean") {
                    return (
                      <li key={key}>
                        <label className="flex min-h-11 cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => setSetting(key, e.target.checked)}
                            className="mt-1"
                            aria-describedby={`setting-desc-${key}`}
                          />
                          <SettingCopy id={`setting-desc-${key}`} label={meta.label} description={meta.description} />
                        </label>
                      </li>
                    );
                  }

                  if (meta.control.type === "select" && typeof value === "string") {
                    const options = key === "timezone" ? timezoneOptions : meta.control.options;
                    const description =
                      key === "timezone" && geoBusy
                        ? `${meta.description} Checking location…`
                        : meta.description;
                    return (
                      <li key={key}>
                        <label className="block" htmlFor={`setting-${key}`}>
                          <SettingCopy label={meta.label} description={description} />
                          <select
                            id={`setting-${key}`}
                            value={value}
                            onChange={(e) =>
                              setSetting(key, e.target.value as HearthSettings[typeof key])
                            }
                            className="mt-2 min-h-11 w-full border border-rule bg-paper px-3 py-2 text-sm text-ink"
                          >
                            {options.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </li>
                    );
                  }

                  return null;
                })}
              </ul>
            </section>
          ))}

          {showClinicalSharing ? (
            <section className="px-4 py-4" aria-labelledby="settings-clinical-heading">
              <h3 id="settings-clinical-heading" className="text-sm font-semibold text-ink">
                Privacy &amp; sharing
              </h3>
              <p className="mt-2 text-sm text-mute">
                Clinician sharing is{" "}
                <span className="font-medium text-ink">{clinicalOptIn ? "on" : "off"}</span> for your profile.
              </p>
              <Link
                href="/family/settings/clinical-sharing"
                onClick={onClose}
                className="mt-3 inline-flex min-h-11 items-center rounded-sm border border-rule px-4 text-sm font-medium text-ink hover:bg-accent-tint"
              >
                Manage clinician sharing
              </Link>
            </section>
          ) : null}

          {signedIn ? (
            <section className="px-4 py-4" aria-labelledby="settings-account-heading">
              <h3 id="settings-account-heading" className="text-sm font-semibold text-ink">Account</h3>
              {userDisplayName ? (
                <p className="mt-2 text-sm text-mute">
                  Signed in as <span className="font-medium text-ink">{userDisplayName}</span>
                </p>
              ) : (
                <p className="mt-2 text-sm text-mute">You are signed in.</p>
              )}
              <button
                type="button"
                onClick={signOut}
                className="mt-3 min-h-11 rounded-sm border border-rule px-4 text-sm font-medium text-ink hover:bg-accent-tint"
              >
                Sign out
              </button>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SettingCopy({
  id,
  label,
  description,
}: {
  id?: string;
  label: string;
  description: string;
}) {
  return (
    <span className="min-w-0">
      <span className="block text-sm font-medium text-ink">{label}</span>
      <span id={id} className="mt-0.5 block text-sm text-mute">{description}</span>
    </span>
  );
}
