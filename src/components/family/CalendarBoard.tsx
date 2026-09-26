"use client";

import { useFamily } from "@/components/family/FamilyChrome";
import { formatDay } from "@/lib/clock";
import type { CalendarEvent, Member } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export function CalendarBoard({ events, members }: { events: CalendarEvent[]; members: Member[] }) {
  const { me, easy } = useFamily();
  const router = useRouter();
  const [text, setText] = useState("Sofia has her soccer tournament this Saturday at 10 AM at Piedmont Park");
  const names = Object.fromEntries(members.map((m) => [m.id, m]));

  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = e.startsAt.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  async function create() {
    if (!text.trim()) return;
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ familyId: me.familyId, authorId: me.id, text }),
    });
    setText("");
    router.refresh();
  }

  const soon = events.find((e) => new Date(e.startsAt) > new Date());

  return (
    <div>
      <h1 className="font-serif text-4xl tracking-tight">Family calendar</h1>
      <p className="mt-2 text-mute">Say it like a person. Hearth files the rest.</p>
      {soon ? (
        <p className="mt-4 rounded-2xl bg-orange-50 px-4 py-3 text-sm leading-6">
          Soft reminder: <span className="font-semibold">{soon.title}</span> · {formatDay(soon.startsAt)}
          {soon.location ? ` · ${soon.location}` : ""}. No alarm — just a nudge so James on campus isn&apos;t left out.
        </p>
      ) : null}
      <div className="mt-6 rounded-3xl border border-line bg-paper p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={`w-full rounded-2xl border border-line bg-cream px-4 py-3 ${easy ? "min-h-28 text-xl" : "min-h-20"}`}
        />
        <button
          type="button"
          onClick={create}
          className={`mt-3 rounded-full bg-ink px-5 font-semibold text-paper ${easy ? "h-14 text-lg" : "h-11"}`}
        >
          Add from sentence
        </button>
      </div>
      <div className="mt-8 space-y-6">
        {grouped.map(([day, list]) => (
          <section key={day}>
            <h2 className="font-serif text-2xl">{formatDay(list[0].startsAt)}</h2>
            <ul className="mt-3 space-y-3">
              {list.map((e) => (
                <li key={e.id} className="rounded-2xl border border-line bg-paper px-4 py-3">
                  <p className="font-semibold">{e.title}</p>
                  <p className="text-sm text-mute">
                    {new Date(e.startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    {e.location ? ` · ${e.location}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-mute">
                    {e.attendees.map((id) => names[id]?.name.split(" ")[0]).join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
