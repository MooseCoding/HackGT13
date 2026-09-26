"use client";

import { ClinicalConsentToggle } from "@/components/family/ClinicalConsentToggle";
import { FamilyCircleSwitcher } from "@/components/family/FamilyCircleSwitcher";
import { HearthAssistant } from "@/components/family/HearthAssistant";
import { SettingsMenu } from "@/components/settings/SettingsPanel";
import type { AssistantContext } from "@/lib/ai/assistant";
import { DIGEST_NAME } from "@/lib/digest";
import type { Family, Member } from "@/lib/types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

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

export function FamilyChrome({
  demo,
  signedIn,
  inviteCode,
  identityLocked,
  assistantContext,
  families,
  activeFamilyId,
  activeFamilyName,
  userDisplayName,
}: {
  demo: boolean;
  canGoLive?: boolean;
  signedIn: boolean;
  inviteCode?: string;
  identityLocked: boolean;
  assistantContext: Omit<AssistantContext, "postingAs" | "path">;
  families: Family[];
  activeFamilyId: string;
  activeFamilyName: string;
  userDisplayName?: string;
}) {
  const { members, me, setMeId } = useFamily();
  const path = usePathname();
  const links = [
    { href: "/family", label: "Family feed" },
    { href: "/family/calendar", label: "Calendar" },
    { href: "/family/digest", label: DIGEST_NAME },
    { href: "/family/reminders", label: "Reminders" },
    { href: "/family/circle", label: "Circle" },
  ];

  return (
    <header className="border-b border-white/50 bg-transparent">
      <div className="mx-auto max-w-6xl px-3 pt-3 sm:px-4">
        <div className="glass flex flex-wrap items-center gap-x-2 gap-y-2 rounded-2xl px-3 py-2.5 sm:gap-x-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Link href="/" className="font-brand shrink-0 text-base text-ink">
              Hearth
            </Link>
            {families.length > 0 ? (
              <>
                <span className="hidden h-5 w-px shrink-0 bg-chrome-divider sm:block" aria-hidden />
                <FamilyCircleSwitcher
                  families={families}
                  activeFamilyId={activeFamilyId}
                  activeFamilyName={activeFamilyName}
                  defaultName={userDisplayName}
                />
              </>
            ) : null}
          </div>
          <nav className="-mx-1 flex min-w-0 flex-1 basis-full gap-3 overflow-x-auto sm:basis-auto" aria-label="Family">
            {links.map((l) => {
              const current = path === l.href || (l.href !== "/family" && path.startsWith(l.href));
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={current ? "page" : undefined}
                  className={`min-h-11 shrink-0 px-1 py-2 text-sm ${
                    current
                      ? "font-semibold text-ember underline decoration-ember decoration-2 underline-offset-8"
                      : "text-mute hover:text-ink hover:underline"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex w-full flex-wrap items-center gap-3 sm:ml-auto sm:w-auto">
            {inviteCode ? (
              <span className="hidden text-xs text-mute lg:inline" title="Use this code to join this circle">
                Invite <strong className="font-mono text-ink">{inviteCode}</strong>
              </span>
            ) : null}
            <SettingsMenu signedIn={signedIn} userDisplayName={userDisplayName} />
            {!demo && identityLocked && signedIn && me ? (
              <ClinicalConsentToggle key={me.id} member={me} />
            ) : null}
            <HearthAssistant context={{ ...assistantContext, postingAs: me?.name }} />
            <label className="sr-only" htmlFor="posting-as">
              Posting as
            </label>
            <select
              id="posting-as"
              value={me?.id ?? ""}
              onChange={(e) => setMeId(e.target.value)}
              disabled={identityLocked}
              title={identityLocked ? "Your signed-in account is linked to this member" : "Posting as"}
              className="min-h-11 min-w-32 flex-1 rounded-xl border border-line bg-paper/80 px-2 py-1 text-sm text-ink sm:flex-none"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {demo ? (
              <span
                className="text-xs font-medium text-mute"
                title="Started from Preview sample family on the homepage"
              >
                Sample family
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
