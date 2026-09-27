"use client";

import { SettingsMenu } from "@/components/settings/SettingsPanel";
import { DIGEST_NAME } from "@/lib/digest-constants";
import type { Family, Member } from "@/lib/types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Ctx = {
  members: Member[];
  me: Member;
  setMeId: (id: string) => void;
};

const FamilyCtx = createContext<Ctx | null>(null);

export function useFamily() {
  const v = useContext(FamilyCtx);
  if (!v) throw new Error("FamilyProvider missing");
  return v;
}

export function FamilyProvider({
  members,
  currentMemberId,
  children,
}: {
  members: Member[];
  currentMemberId?: string;
  children: React.ReactNode;
}) {
  const defaultMember = members.find((m) => m.id === currentMemberId) ?? members.find((m) => m.easyModeDefault) ?? members[0];
  const [meId, setMeId] = useState(defaultMember?.id ?? "");
  const me = members.find((m) => m.id === meId) ?? members[0];

  useEffect(() => {
    if (currentMemberId) return;
    const saved = localStorage.getItem("hearth-me");
    if (!saved || !members.some((m) => m.id === saved)) return;
    const timer = window.setTimeout(() => setMeId(saved), 0);
    return () => window.clearTimeout(timer);
  }, [currentMemberId, members]);

  useEffect(() => {
    localStorage.setItem("hearth-me", meId);
  }, [meId]);

  const value = useMemo(() => ({ members, me, setMeId }), [members, me]);
  return <FamilyCtx.Provider value={value}>{children}</FamilyCtx.Provider>;
}

function MessagesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M3 4.5A1.5 1.5 0 0 1 4.5 3h11A1.5 1.5 0 0 1 17 4.5v7A1.5 1.5 0 0 1 15.5 13H8l-3.5 3v-3H4.5A1.5 1.5 0 0 1 3 11.5v-7Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="3" y="4.5" width="14" height="12.5" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
      <path d="M3 8.5h14M7 2.5v3M13 2.5v3" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

function StoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M5 3.5h10v13H5V3.5Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path d="M8 7.5h4M8 10.5h4M8 13.5h2.5" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

function RemindersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 3.5a4 4 0 0 0-4 4v3L4.5 13h11L14 10.5v-3a4 4 0 0 0-4-4Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path d="M8.5 14a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

function shortFamilyName(name: string) {
  const trimmed = name.replace(/^the\s+/i, "").trim();
  if (trimmed.length <= 18) return trimmed;
  return `${trimmed.slice(0, 16)}…`;
}

function CircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="7" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="13.5" cy="8" r="2" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M3.5 16c0-2.5 2-4 3.5-4s3.5 1.5 3.5 4M12 16c0-1.8 1.3-3 2.5-3s2.5 1.2 2.5 3"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

const NAV_LINKS = [
  { href: "/family", label: "Messages", icon: MessagesIcon },
  { href: "/family/calendar", label: "Calendar", icon: CalendarIcon },
  { href: "/family/digest", label: DIGEST_NAME, icon: StoryIcon },
  { href: "/family/reminders", label: "Reminders", icon: RemindersIcon },
  { href: "/family/circle", label: "Circle", icon: CircleIcon },
] as const;

export function FamilyChrome({
  demo,
  signedIn,
  identityLocked,
  families,
  activeFamilyId,
  activeFamilyName,
  autoAddFamilyCalls = true,
  userDisplayName,
  children,
}: {
  demo: boolean;
  canGoLive?: boolean;
  signedIn: boolean;
  identityLocked: boolean;
  families: Family[];
  activeFamilyId: string;
  activeFamilyName: string;
  autoAddFamilyCalls?: boolean;
  userDisplayName?: string;
  children: ReactNode;
}) {
  const { members, me, setMeId } = useFamily();
  const path = usePathname();
  const showPostingSelect = demo && !identityLocked;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-ground">
      <header className="shrink-0 border-b border-white/50 bg-transparent px-3 pt-3 sm:px-4">
        <div className="glass space-y-2 rounded-2xl px-3 py-2.5 text-ink sm:space-y-0 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/" className="font-brand shrink-0 text-base text-ink">
              Hearth
            </Link>
            {families.length > 0 ? (
              <>
                <span className="hidden h-5 w-px shrink-0 bg-chrome-divider sm:block" aria-hidden />
                <div
                  className="hidden min-w-0 items-center gap-2 sm:flex"
                  aria-label={`Current circle: ${activeFamilyName}`}
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-ember text-xs font-bold text-white"
                    aria-hidden
                  >
                    {activeFamilyName.charAt(0).toUpperCase()}
                  </span>
                  <span className="max-w-[10rem] truncate text-sm font-semibold leading-tight text-ink">
                    {shortFamilyName(activeFamilyName)}
                  </span>
                </div>
              </>
            ) : null}

            <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
              <SettingsMenu
                signedIn={signedIn}
                userDisplayName={userDisplayName}
                showClinicalSharing={!demo && identityLocked && signedIn}
                clinicalOptIn={me?.clinicalOptIn ?? false}
                families={families}
                activeFamilyId={activeFamilyId}
                activeFamilyName={activeFamilyName}
                autoAddFamilyCalls={autoAddFamilyCalls}
                compact
              />
              {showPostingSelect ? (
                <>
                  <label className="sr-only" htmlFor="posting-as">
                    Posting as
                  </label>
                  <select
                    id="posting-as"
                    value={me?.id ?? ""}
                    onChange={(e) => setMeId(e.target.value)}
                    title="Posting as"
                    className="min-h-11 max-w-[6.5rem] rounded-xl border border-line bg-paper/80 px-1.5 py-1 text-sm text-ink sm:max-w-none sm:min-w-32 sm:px-2"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </>
              ) : identityLocked && me?.name ? (
                <span className="hidden max-w-[5.5rem] truncate text-sm text-mute sm:inline sm:max-w-none" title={me.name}>
                  {me.name}
                </span>
              ) : null}
              {demo ? (
                <span
                  className="hidden text-xs font-medium text-mute sm:inline"
                  title="Started from Preview sample family on the homepage"
                >
                  Sample family
                </span>
              ) : null}
            </div>
          </div>

          {families.length > 0 ? (
            <div
              className="flex min-w-0 items-center gap-2 sm:hidden"
              aria-label={`Current circle: ${activeFamilyName}`}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-ember text-xs font-bold text-white"
                aria-hidden
              >
                {activeFamilyName.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 truncate text-sm font-semibold leading-tight text-ink">
                {shortFamilyName(activeFamilyName)}
              </span>
            </div>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main id="main-content" className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          {children}
        </main>

        <nav
          className="flex w-[4.25rem] shrink-0 flex-col gap-0.5 border-l border-nav-rail-border bg-nav-rail-bg px-1.5 py-2 sm:w-44 sm:px-2"
          aria-label="Family"
        >
          {NAV_LINKS.map((l) => {
            const current = path === l.href || (l.href !== "/family" && path.startsWith(l.href));
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={current ? "page" : undefined}
                title={l.label}
                className={`flex min-h-11 items-center justify-center gap-2.5 rounded-sm px-2 py-2 text-sm transition-colors sm:justify-end ${
                  current
                    ? "bg-nav-rail-active-bg font-semibold text-ember"
                    : "text-nav-rail-fg-muted hover:bg-ground hover:text-nav-rail-fg"
                }`}
              >
                <span className="hidden truncate sm:inline">{l.label}</span>
                <Icon className="shrink-0" />
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
