"use client";

import { FamilyCircleSwitcher } from "@/components/family/FamilyCircleSwitcher";
import { HearthAssistant } from "@/components/family/HearthAssistant";
import { DIGEST_NAME } from "@/lib/digest";
import type { AssistantContext } from "@/lib/ai/assistant";
import type { Family, Member } from "@/lib/types";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Ctx = {
  members: Member[];
  me: Member;
  setMeId: (id: string) => void;
  easy: boolean;
  setEasy: (v: boolean) => void;
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
  const [easy, setEasy] = useState(defaultMember?.easyModeDefault ?? false);
  const me = members.find((m) => m.id === meId) ?? members[0];

  useEffect(() => {
    if (currentMemberId) return;
    const saved = localStorage.getItem("hearth-me");
    if (saved && members.some((m) => m.id === saved)) setMeId(saved);
  }, [currentMemberId, members]);

  useEffect(() => {
    localStorage.setItem("hearth-easy", easy ? "1" : "0");
    document.documentElement.classList.toggle("easy", easy);
  }, [easy]);

  useEffect(() => {
    localStorage.setItem("hearth-me", meId);
  }, [meId]);

  const value = useMemo(() => ({ members, me, setMeId, easy, setEasy }), [members, me, easy]);
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
  const { members, me, setMeId, easy, setEasy } = useFamily();
  const path = usePathname();
  const router = useRouter();
  const links = [
    { href: "/family", label: "Chats" },
    { href: "/family/calendar", label: "Calendar" },
    { href: "/family/digest", label: DIGEST_NAME },
  ];

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-line bg-paper">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 px-3 py-2.5 sm:gap-x-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/"
            className="shrink-0 font-brand text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
          >
            Hearth
          </Link>
          {families.length > 0 ? (
            <>
              <span className="hidden h-5 w-px shrink-0 bg-line sm:block" aria-hidden />
              <FamilyCircleSwitcher
                families={families}
                activeFamilyId={activeFamilyId}
                activeFamilyName={activeFamilyName}
                defaultName={userDisplayName}
              />
            </>
          ) : null}
        </div>
        <nav className="-mx-1 flex min-w-0 flex-1 basis-full gap-1 overflow-x-auto sm:basis-auto" aria-label="Family">
          {links.map((l) => {
            const current = path === l.href || (l.href !== "/family" && path.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={current ? "page" : undefined}
                className={`min-h-11 shrink-0 px-3 py-2 text-sm ${
                  current ? "font-semibold text-ember" : "text-mute hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex w-full flex-wrap items-center gap-3 sm:ml-auto sm:w-auto">
          {inviteCode ? (
            <span className="hidden text-xs text-mute lg:inline" title="Use this code to join this family">
              Invite <strong className="font-mono text-ink">{inviteCode}</strong>
            </span>
          ) : null}
          <label className="flex min-h-11 items-center gap-1.5 text-sm text-mute">
            <input type="checkbox" checked={easy} onChange={(e) => setEasy(e.target.checked)} />
            Easy
          </label>
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
            className="min-h-11 min-w-32 flex-1 rounded-md border border-line bg-paper px-2 py-1 text-sm sm:flex-none"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {demo ? (
            <span
              className="rounded-md bg-cream px-2 py-1 text-xs font-medium text-mute"
              title="Started from Preview the demo family on the homepage"
            >
              Sample family
            </span>
          ) : null}
          {signedIn ? (
            <button
              type="button"
              onClick={signOut}
              className="min-h-11 text-sm text-mute hover:text-ink"
            >
              Sign out
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
