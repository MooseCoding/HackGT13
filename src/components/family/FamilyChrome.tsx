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
  const [meId, setMeId] = useState(members[0]?.id ?? "");
  const [easy, setEasy] = useState(false);
  const me = members.find((m) => m.id === meId) ?? members[0];

  useEffect(() => {
    const saved = localStorage.getItem("hearth-easy");
    const who = localStorage.getItem("hearth-me");
    if (saved === "1") setEasy(true);
    if (who && members.some((m) => m.id === who)) setMeId(who);
    else if (members.find((m) => m.easyModeDefault)) {
      /* keep default first member unless stored */
    }
  }, [members]);

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
    { href: "/family", label: "Feed" },
    { href: "/family/calendar", label: "Calendar" },
    { href: "/family/digest", label: "This week" },
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" className="font-serif text-xl">
          Hearth
        </Link>
        <nav className="flex flex-1 gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-full px-3 py-2 text-sm font-semibold ${
                path === l.href ? "bg-ink text-paper" : "text-mute hover:bg-paper"
              } ${easy ? "px-4 py-3 text-base" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={easy} onChange={(e) => setEasy(e.target.checked)} />
          Easy
        </label>
        <select
          className="rounded-full border border-line bg-paper px-3 py-2 text-sm"
          value={me.id}
          onChange={(e) => setMeId(e.target.value)}
          aria-label="Posting as"
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
