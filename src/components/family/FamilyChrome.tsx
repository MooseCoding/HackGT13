"use client";

import type { Member } from "@/lib/types";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  children,
}: {
  members: Member[];
  children: React.ReactNode;
}) {
  const defaultMember = members.find((m) => m.easyModeDefault) ?? members[0];
  const [meId, setMeId] = useState(defaultMember?.id ?? "");
  const [easy, setEasy] = useState(defaultMember?.easyModeDefault ?? false);
  const me = members.find((m) => m.id === meId) ?? members[0];

  useEffect(() => {
    const savedEasy = localStorage.getItem("hearth-easy");
    const who = localStorage.getItem("hearth-me");
    if (savedEasy === "1") setEasy(true);
    else if (savedEasy === null && defaultMember?.easyModeDefault) setEasy(true);
    if (who && members.some((m) => m.id === who)) setMeId(who);
  }, [members, defaultMember?.easyModeDefault]);

  useEffect(() => {
    localStorage.setItem("hearth-easy", easy ? "1" : "0");
    document.documentElement.classList.toggle("easy", easy);
  }, [easy]);

  useEffect(() => {
    localStorage.setItem("hearth-me", meId);
  }, [meId]);

  const value = useMemo(() => ({ members, me, setMeId, easy, setEasy }), [members, me, meId, easy]);
  return <FamilyCtx.Provider value={value}>{children}</FamilyCtx.Provider>;
}

export function FamilyChrome() {
  const { members, me, setMeId, easy, setEasy } = useFamily();
  const path = usePathname();
  const links = [
    { href: "/family", label: "Chats" },
    { href: "/family/calendar", label: "Calendar" },
    { href: "/family/digest", label: "This week" },
  ];

  return (
    <header className="border-b border-line bg-paper">
      <div className="flex items-center gap-4 px-4 py-2.5">
        <Link href="/" className="text-base font-semibold text-ink">
          Hearth
        </Link>
        <nav className="flex gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 text-sm ${
                path === l.href ? "font-semibold text-ember" : "text-mute hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-mute">
            <input type="checkbox" checked={easy} onChange={(e) => setEasy(e.target.checked)} />
            Easy
          </label>
          <select
            value={me.id}
            onChange={(e) => setMeId(e.target.value)}
            className="rounded-sm border border-line bg-paper px-2 py-1 text-sm"
            aria-label="You are"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
