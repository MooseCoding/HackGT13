"use client";

import { CircleSettingsSection } from "@/components/settings/CircleSettingsSection";
import { useSettings } from "@/components/settings/SettingsProvider";
import { SETTING_META, THEME_OPTIONS, type FamilyrSettings, type SettingKey } from "@/lib/settings";
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
import { useEffect, useMemo, useState, type ReactNode } from "react";

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

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
  id,
  describedBy,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  id?: string;
  describedBy?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-ember" : "bg-rule"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  labelledBy,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
  labelledBy?: string;
}) {
  return (
    <div className="flex rounded-lg border border-rule bg-ground p-1" role="group" aria-labelledby={labelledBy}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`flex-1 rounded-md px-2 py-2 text-xs font-medium transition-colors sm:text-sm ${
            value === option.value ? "bg-surface text-ink shadow-sm" : "text-mute hover:text-ink"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const SELECT_CLASS =
  "mt-3 min-h-11 w-full rounded-lg border border-rule bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors hover:border-ink/25 focus:border-ember";

function SettingsSection({
  title,
  description,
  children,
  headingId,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  headingId: string;
}) {
  return (
    <section className="px-4 py-5" aria-labelledby={headingId}>
      <div className="mb-3">
        <h3 id={headingId} className="text-xs font-semibold uppercase tracking-[0.12em] text-mute">
          {title}
        </h3>
        {description ? <p className="mt-1 text-sm text-mute">{description}</p> : null}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function SettingsCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-rule bg-paper px-4 py-3.5 shadow-sm shadow-black/[0.03]">{children}</div>
  );
}

function SettingsLinkRow({
  href,
  onClick,
  label,
  description,
  status,
}: {
  href: string;
  onClick?: () => void;
  label: string;
  description?: string;
  status?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl border border-rule bg-paper px-4 py-3.5 shadow-sm shadow-black/[0.03] transition-colors hover:border-ink/20 hover:bg-accent-tint"
    >
      <div className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description ? <span className="mt-0.5 block text-sm text-mute">{description}</span> : null}
        {status ? (
          <span className="mt-1 inline-flex rounded-sm bg-accent-tint px-2 py-0.5 text-xs font-medium text-ink">
            {status}
          </span>
        ) : null}
      </div>
      <ChevronRightIcon className="shrink-0 text-mute transition-colors group-hover:text-ink" />
    </Link>
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
      ? `Auto - ${formatTimezoneLabel(geoTimezone)} (location)`
      : `Auto - ${formatTimezoneLabel(deviceTimezone)} (device)`;
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--overlay)] p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="landing-rise flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-rule bg-surface shadow-2xl shadow-black/10 sm:max-h-[90dvh] sm:rounded-2xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-rule bg-surface px-5 py-4">
          <div>
            <h2 id="settings-title" className="text-lg font-semibold tracking-tight text-ink">Settings</h2>
            <p className="mt-0.5 text-sm text-mute">Stuff that stays on this device.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-mute transition-colors hover:bg-accent-tint hover:text-ink"
            aria-label="Close settings"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="divide-y divide-rule overflow-y-auto">
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
            <SettingsSection key={group} title={group} headingId={`settings-group-${group}`}>
              {keys.map((key) => {
                const meta = SETTING_META[key];
                const value = settings[key];

                if (meta.control.type === "boolean" && typeof value === "boolean") {
                  return (
                    <SettingsCard key={key}>
                      <div className="flex items-center justify-between gap-4">
                        <SettingCopy id={`setting-desc-${key}`} label={meta.label} description={meta.description} />
                        <ToggleSwitch
                          checked={value}
                          onChange={(next) => setSetting(key, next)}
                          describedBy={`setting-desc-${key}`}
                        />
                      </div>
                    </SettingsCard>
                  );
                }

                if (meta.control.type === "select" && typeof value === "string") {
                  const options = key === "timezone" ? timezoneOptions : meta.control.options;
                  const description =
                    key === "timezone" && geoBusy
                      ? `${meta.description} Checking location…`
                      : meta.description;

                  if (key === "theme") {
                    return (
                      <SettingsCard key={key}>
                        <SettingCopy
                          id={`setting-desc-${key}`}
                          label={meta.label}
                          description={description}
                        />
                        <div className="mt-3">
                          <SegmentedControl
                            value={value as FamilyrSettings["theme"]}
                            options={THEME_OPTIONS}
                            onChange={(next) => setSetting("theme", next)}
                            labelledBy={`setting-desc-${key}`}
                          />
                        </div>
                      </SettingsCard>
                    );
                  }

                  return (
                    <SettingsCard key={key}>
                      <label className="block" htmlFor={`setting-${key}`}>
                        <SettingCopy label={meta.label} description={description} />
                        <select
                          id={`setting-${key}`}
                          value={value}
                          onChange={(e) =>
                            setSetting(key, e.target.value as FamilyrSettings[typeof key])
                          }
                          className={SELECT_CLASS}
                        >
                          {options.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </SettingsCard>
                  );
                }

                return null;
              })}
            </SettingsSection>
          ))}

          <SettingsSection
            title="Insurance"
            description="Add coverage so clinicians in network can find your family member in the care-team portal."
            headingId="settings-insurance-heading"
          >
            <SettingsLinkRow
              href="/family/settings/insurance"
              onClick={onClose}
              label="Manage insurance"
              description="Carrier, member ID, and in-network matches"
            />
          </SettingsSection>

          {showClinicalSharing ? (
            <SettingsSection
              title="Privacy & sharing"
              headingId="settings-clinical-heading"
            >
              <SettingsLinkRow
                href="/family/settings/clinical-sharing"
                onClick={onClose}
                label="Clinician sharing"
                description="Control what activity patterns care-team accounts can see"
                status={clinicalOptIn ? "On" : "Off"}
              />
            </SettingsSection>
          ) : null}

          {signedIn ? (
            <SettingsSection title="Account" headingId="settings-account-heading">
              <SettingsCard>
                {userDisplayName ? (
                  <p className="text-sm text-mute">
                    Signed in as <span className="font-medium text-ink">{userDisplayName}</span>
                  </p>
                ) : (
                  <p className="text-sm text-mute">You are signed in.</p>
                )}
                <button
                  type="button"
                  onClick={signOut}
                  className="mt-3 min-h-11 w-full rounded-lg border border-rule px-4 text-sm font-medium text-ink transition-colors hover:border-ink/25 hover:bg-accent-tint"
                >
                  Sign out
                </button>
              </SettingsCard>
            </SettingsSection>
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
