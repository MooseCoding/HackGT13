"use client";

import { DemoModeSwitch } from "@/components/DemoModeSwitch";
import type { Member } from "@/lib/types";
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
  canGoLive,
  signedIn,
  inviteCode,
  identityLocked,
}: {
  demo: boolean;
  canGoLive: boolean;
  signedIn: boolean;
  inviteCode?: string;
  identityLocked: boolean;
}) {
  const { members, me, setMeId, easy, setEasy } = useFamily();
  const path = usePathname();
  const router = useRouter();
  const [sharingOverrides, setSharingOverrides] = useState<Record<string, boolean>>({});
  const [savingConsent, setSavingConsent] = useState(false);
  const [consentError, setConsentError] = useState("");
  const sharing = sharingOverrides[me?.id] ?? me?.clinicalOptIn ?? false;
  const links = [
    { href: "/family", label: "Chats" },
    { href: "/family/calendar", label: "Calendar" },
    { href: "/family/digest", label: "This week" },
    { href: "/hcp", label: "Clinician" },
  ];

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  async function updateSharing(enabled: boolean) {
    const previous = sharing;
    setSharingOverrides((values) => ({ ...values, [me.id]: enabled }));
    setSavingConsent(true);
    setConsentError("");
    const response = await fetch("/api/consent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: me.id, enabled }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setSharingOverrides((values) => ({ ...values, [me.id]: previous }));
      setConsentError(result.error || "Could not update sharing.");
    }
    setSavingConsent(false);
  }

  return (
    <header className="border-b border-line bg-paper">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:gap-4 sm:px-4">
        <Link
          href="/"
          className="font-serif text-base font-semibold tracking-tight text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
        >
          Hearth
        </Link>
        <nav className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto" aria-label="Family">
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
          <label className="flex min-h-11 items-center gap-1.5 text-sm text-mute" title="Controls server-side clinician access">
            <input
              type="checkbox"
              checked={sharing}
              disabled={savingConsent || !me}
              onChange={(event) => updateSharing(event.target.checked)}
            />
            Clinician sharing
          </label>
          <label className="flex min-h-11 items-center gap-1.5 text-sm text-mute">
            <input type="checkbox" checked={easy} onChange={(e) => setEasy(e.target.checked)} />
            Easy
          </label>
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
          <DemoModeSwitch demo={demo} canGoLive={canGoLive} compact />
          {signedIn ? (
            <button
              type="button"
              onClick={signOut}
              className="min-h-11 text-sm text-mute hover:text-ink"
            >
              Sign out
            </button>
          ) : null}
          {consentError ? <span className="w-full text-xs text-red-700" role="alert">{consentError}</span> : null}
        </div>
      </div>
    </header>
  );
}
