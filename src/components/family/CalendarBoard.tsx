"use client";

import { useFamily } from "@/components/family/FamilyChrome";
import { exampleEventText } from "@/lib/calendar-parse";
import { CAL_WEEKS, localDateKey } from "@/lib/calendar-window";
import { calendarAnchor } from "@/lib/clock";
import { createSupabaseBrowser } from "@/lib/supabase/browser";
import type { PublicSupabaseConfig } from "@/lib/supabase/public";
import type { CalendarEvent } from "@/lib/types";
import { useCallback, useEffect, useMemo, useState } from "react";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthGrid(focus: Date) {
  const start = new Date(focus.getFullYear(), focus.getMonth(), 1);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function isFamilyEvent(e: CalendarEvent) {
  // Family circle events + anything synced from Google so prior Google history shows up.
  if (e.isGoogleSynced) return true;
  return e.attendees.length > 1;
}

function isMineEvent(e: CalendarEvent, meId: string) {
  return e.isGoogleSynced || (e.attendees.length === 1 && e.createdBy === meId);
}

export function CalendarBoard({
  familyId,
  supabaseConfig,
  initialDraft = "",
}: {
  familyId: string;
  supabaseConfig: PublicSupabaseConfig | null;
  initialDraft?: string;
}) {
  const { me, easy } = useFamily();
  const [demo, setDemo] = useState(true);
  const [anchor, setAnchor] = useState(() => calendarAnchor(true));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [text, setText] = useState(initialDraft);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [view, setView] = useState<"family" | "mine">("family");
  const [weekOff, setWeekOff] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [syncToGoogle, setSyncToGoogle] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/demo")
      .then((r) => r.json())
      .then((d) => {
        setDemo(Boolean(d.demo));
        setAnchor(calendarAnchor(Boolean(d.demo)));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (demo || !supabaseConfig) return;
    const supabase = createSupabaseBrowser(supabaseConfig);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setGoogleToken(session?.provider_token ?? null);
    });
  }, [demo, supabaseConfig]);

  const load = useCallback(async () => {
    const q = new URLSearchParams({ familyId });
    if (googleToken) q.set("googleToken", googleToken);
    const res = await fetch(`/api/events?${q}`);
    if (res.ok) {
      const data = await res.json();
      setEvents(data.events);
      setGoogleConnected(Boolean(data.googleConnected));
    }
  }, [familyId, googleToken]);

  useEffect(() => {
    load();
  }, [load]);

  const focus = useMemo(() => {
    const d = new Date(anchor);
    d.setDate(d.getDate() + weekOff * 7);
    return d;
  }, [anchor, weekOff]);

  const month = new Date(focus.getFullYear(), focus.getMonth(), 1);
  const cells = monthGrid(focus);

  const shown = useMemo(
    () => events.filter((e) => (view === "family" ? isFamilyEvent(e) : isMineEvent(e, me.id))),
    [events, view, me.id],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of shown) {
      const k = localDateKey(e.startsAt);
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return map;
  }, [shown]);

  const picked = pick ? byDay.get(pick) ?? [] : [];

  const QUICK = [
    "Doctor checkup tomorrow at 9 AM",
    "Family dinner Friday at 6 PM",
    "Soccer practice Saturday at 10 AM at Piedmont Park",
  ];

  async function create() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyId,
          authorId: me.id,
          text,
          calendar: view,
          syncToGoogle,
          googleToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Could not add event.");
        return;
      }
      if (data.warning) setMsg(data.warning);
      else setMsg(`Added to ${view === "family" ? "family" : "your"} calendar.`);
      setText("");
      setPick(localDateKey(data.startsAt));
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(e: CalendarEvent) {
    if (deletingId) return;
    setDeletingId(e.id);
    setMsg("");
    try {
      const q = new URLSearchParams({ id: e.id, familyId: e.familyId });
      if (e.googleEventId) q.set("googleEventId", e.googleEventId);
      if (googleToken) q.set("googleToken", googleToken);
      const res = await fetch(`/api/events?${q}`, { method: "DELETE", credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not delete event.");
      setEvents((prev) => prev.filter((x) => x.id !== e.id));
      if (pick && picked.length <= 1) setPick(null);
      setMsg("Event removed.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not delete event.");
      await load();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Calendar</h1>
        <div className="flex border border-line text-sm">
          <button type="button" onClick={() => setView("family")} className={`px-3 py-1 ${view === "family" ? "bg-ember text-white" : "bg-paper"}`}>
            Family
          </button>
          <button type="button" onClick={() => setView("mine")} className={`px-3 py-1 ${view === "mine" ? "bg-ember text-white" : "bg-paper"}`}>
            My calendar
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs text-mute">
        {view === "family"
          ? "Shared family events plus Google Calendar history when connected"
          : "Your personal events and Google Calendar"}
      </p>
      {!demo && !googleConnected ? (
        <p className="mt-2 text-sm">
          <a href="/api/auth/google" className="font-medium text-ember underline-offset-2 hover:underline">
            Connect Google Calendar
          </a>{" "}
          to pull in previous and upcoming events.
        </p>
      ) : null}
      {!demo && googleConnected ? (
        <p className="mt-2 text-xs text-mute">Google Calendar connected · prior events sync into this view.</p>
      ) : null}
      {msg ? <p className="mt-2 text-sm text-ember-dark">{msg}</p> : null}

      <div className="mt-3 flex items-center justify-between border border-line bg-paper px-3 py-2">
        <button type="button" disabled={weekOff <= -CAL_WEEKS} onClick={() => setWeekOff((w) => w - 1)} className="px-2 disabled:opacity-30">←</button>
        <span className="text-sm font-medium">{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
        <button type="button" disabled={weekOff >= CAL_WEEKS} onClick={() => setWeekOff((w) => w + 1)} className="px-2 disabled:opacity-30">→</button>
      </div>

      <div className="grid grid-cols-7 border-x border-b border-line bg-paper text-center text-xs text-mute">
        {DOW.map((d) => (
          <div key={d} className="border-t border-line py-1.5 font-medium">{d}</div>
        ))}
        {cells.map((d) => {
          const k = localDateKey(d);
          const inMonth = d.getMonth() === month.getMonth();
          const dayEvents = byDay.get(k) ?? [];
          const today = localDateKey(anchor);
          return (
            <button
              key={k}
              type="button"
              onClick={() => setPick(k)}
              className={`min-h-[68px] border-t border-r border-line p-1 text-left ${!inMonth ? "bg-cream/50 text-mute" : ""} ${k === today ? "ring-1 ring-inset ring-ember" : ""} ${
                /* CHANGE HERE: Replace "bg-cream" with your preferred blue utility class (e.g., "bg-blue-100") */
                pick === k ? "bg-blue-100" : ""
              }`}
            >
              <span className={`text-sm ${k === today ? "font-bold text-ember" : ""}`}>{d.getDate()}</span>
              <div className="mt-0.5 space-y-0.5">
                {dayEvents.slice(0, 2).map((e) => (
                  <div key={e.id} className="truncate bg-ember/15 px-0.5 text-[10px]">{e.title}</div>
                ))}
                {dayEvents.length > 2 ? <div className="text-[10px]">+{dayEvents.length - 2}</div> : null}
              </div>
            </button>
          );
        })}
      </div>

      {pick ? (
        <div className="mt-3 border border-line bg-paper p-3">
          <p className="text-sm font-medium">{new Date(pick + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          {picked.length === 0 ? (
            <p className="mt-1 text-sm text-mute">No events</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {picked.map((e) => (
                <li key={e.id} className="flex justify-between gap-2 text-sm">
                  <div>
                    <p className="font-medium">{e.title}</p>
                    <p className="text-mute">
                      {new Date(e.startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      {e.location ? ` · ${e.location}` : ""}
                    </p>
                  </div>
                  <button type="button" onClick={() => remove(e)} disabled={deletingId === e.id} className="text-xs text-red-600">
                    {deletingId === e.id ? "…" : "Delete"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <div className="mt-4 border border-line bg-paper p-3">
        <p className="mb-2 text-xs text-mute">Say when it is, who&apos;s involved, and where.</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setText(q)}
              className="border border-line bg-cream px-2 py-0.5 text-[11px] hover:bg-ember/10"
            >
              {q.split(" at ")[0]}
            </button>
          ))}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={view === "family" ? "e.g. Abuela's checkup Thursday at 2 PM at Emory" : "e.g. Dentist Tuesday at 3 PM"}
          className={`w-full border border-line px-3 py-2 ${easy ? "min-h-24 text-base" : "min-h-16 text-sm"}`}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setText(exampleEventText(anchor))} className="border border-line px-2 py-1 text-xs">Example</button>
          {!demo ? (
            <label className="flex items-center gap-1 text-xs text-mute">
              <input type="checkbox" checked={syncToGoogle} onChange={(e) => setSyncToGoogle(e.target.checked)} />
              Also add to my Google Calendar
            </label>
          ) : null}
          <button type="button" onClick={create} disabled={busy || !text.trim()} className="ml-auto bg-ember px-4 py-1.5 text-sm text-white disabled:opacity-50">
            {busy ? "Adding…" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
