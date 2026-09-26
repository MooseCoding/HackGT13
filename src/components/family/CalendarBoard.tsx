"use client";

import { useFamily } from "@/components/family/FamilyChrome";
import { CAL_WEEKS, localDateKey } from "@/lib/calendar-window";
import { searchEventsByClues } from "@/lib/chat-calendar-hints";
import { calendarAnchor } from "@/lib/clock";
import {
  consistentSlotLabel,
  isWeeklyFamilyCall,
  proposalCopy,
  proposeWeeklyFamilyCalls,
} from "@/lib/family-call-schedule";
import { createSupabaseBrowser } from "@/lib/supabase/browser";
import type { PublicSupabaseConfig } from "@/lib/supabase/public";
import type { CalendarEvent } from "@/lib/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

function eventScope(e: CalendarEvent): "family" | "mine" | "unknown" {
  if (e.calendarScope === "family" || e.calendarScope === "mine") return e.calendarScope;
  if (e.isGoogleSynced) return "mine";
  return e.attendees.length === 1 ? "mine" : "family";
}

function isFamilyEvent(e: CalendarEvent) {
  return eventScope(e) === "family";
}

function isMineEvent(e: CalendarEvent, meId: string) {
  if (eventScope(e) !== "mine") return false;
  if (e.isGoogleSynced) return true;
  return e.createdBy === meId;
}

export function CalendarBoard({
  familyId,
  supabaseConfig,
  initialDraft = "",
  offerWeeklyCalls = false,
}: {
  familyId: string;
  supabaseConfig: PublicSupabaseConfig | null;
  initialDraft?: string;
  offerWeeklyCalls?: boolean;
}) {
  const { me, members, easy } = useFamily();
  const [demo, setDemo] = useState(true);
  const [anchor, setAnchor] = useState(() => calendarAnchor(true));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googlePersonalCount, setGooglePersonalCount] = useState(0);
  const [text, setText] = useState(initialDraft);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [view, setView] = useState<"family" | "mine">("family");
  const [monthOff, setMonthOff] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [syncToGoogle, setSyncToGoogle] = useState(false);
  const [msg, setMsg] = useState("");
  const [query, setQuery] = useState("");
  const [schedulingCalls, setSchedulingCalls] = useState(false);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const autoScheduledRef = useRef(false);

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
    const refreshToken = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setGoogleToken(session?.provider_token ?? null);
      });
    };
    refreshToken();
    const { data: sub } = supabase.auth.onAuthStateChange(() => refreshToken());
    return () => sub.subscription.unsubscribe();
  }, [demo, supabaseConfig]);

  const load = useCallback(async () => {
    const q = new URLSearchParams({ familyId });
    if (googleToken) q.set("googleToken", googleToken);
    const res = await fetch(`/api/events?${q}`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setEvents(data.events);
      setGoogleConnected(Boolean(data.googleConnected));
      setGooglePersonalCount(Number(data.googlePersonalCount ?? 0));
      setEventsLoaded(true);
    }
  }, [familyId, googleToken]);

  useEffect(() => {
    load();
  }, [load]);

  const monthBounds = useMemo(() => {
    const min = new Date(anchor);
    min.setDate(min.getDate() - CAL_WEEKS * 7);
    const max = new Date(anchor);
    max.setDate(max.getDate() + CAL_WEEKS * 7);
    const toOff = (d: Date) => (d.getFullYear() - anchor.getFullYear()) * 12 + (d.getMonth() - anchor.getMonth());
    return { minOff: toOff(min), maxOff: toOff(max) };
  }, [anchor]);

  const displayMonth = useMemo(
    () => new Date(anchor.getFullYear(), anchor.getMonth() + monthOff, 1),
    [anchor, monthOff],
  );
  const cells = monthGrid(displayMonth);
  const todayKey = localDateKey(anchor);

  useEffect(() => {
    if (googleConnected) setSyncToGoogle(true);
  }, [googleConnected]);

  const scoped = useMemo(
    () => events.filter((e) => (view === "family" ? isFamilyEvent(e) : isMineEvent(e, me.id))),
    [events, view, me.id],
  );

  const shown = useMemo(() => searchEventsByClues(query, scoped), [query, scoped]);

  const weeklyProposal = useMemo(
    () =>
      proposeWeeklyFamilyCalls(events, {
        familyId,
        createdBy: me.id,
        members,
        anchor,
      }),
    [events, familyId, me.id, members, anchor],
  );

  const hasWeeklyCalls = events.some(isWeeklyFamilyCall);
  const needsWeeklyCalls = weeklyProposal.length > 0;

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
    "Doctor appointment tomorrow at 9 AM",
    "Family dinner Friday at 6 PM",
    "Video call Sunday at 4 PM",
  ];

  async function addWeeklyCalls() {
    if (schedulingCalls || !weeklyProposal.length) return;
    const rescheduling = events.some(isWeeklyFamilyCall);
    setSchedulingCalls(true);
    setMsg("");
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyId,
          authorId: me.id,
          autoWeeklyCalls: true,
          googleToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Could not schedule family calls.");
        return;
      }
      if (data.warning) {
        setMsg(data.warning);
      } else       if (data.count) {
        const g = data.googleSynced ? ` · ${data.googleSynced} added to Google Calendar` : "";
        const verb = rescheduling ? "Rescheduled" : "Scheduled";
        setMsg(`${verb} ${data.count} weekly family call${data.count === 1 ? "" : "s"}${g}.`);
      } else {
        setMsg("No open time slots found in the next few weeks.");
      }
      if (data.events?.[0]) setPick(localDateKey(data.events[0].startsAt));
      setView("family");
      await load();
    } finally {
      setSchedulingCalls(false);
    }
  }

  async function create() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        credentials: "include",
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
      else if (data.googleEventId) {
        setMsg(`Added to ${view === "family" ? "family" : "your"} calendar and Google Calendar.`);
      } else {
        setMsg(`Added to ${view === "family" ? "family" : "your"} calendar.`);
      }
      setText("");
      setPick(localDateKey(data.startsAt));
      await load();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (
      !eventsLoaded ||
      !offerWeeklyCalls ||
      !needsWeeklyCalls ||
      autoScheduledRef.current ||
      schedulingCalls
    ) {
      return;
    }
    autoScheduledRef.current = true;
    void addWeeklyCalls();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot after events load
  }, [eventsLoaded, offerWeeklyCalls, needsWeeklyCalls, schedulingCalls]);

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
      if (isWeeklyFamilyCall(e)) {
        setMsg("Family call removed. Pick new times below when you're ready.");
      } else {
        setMsg("Event removed.");
      }
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
          ? "Events shared with your family circle"
          : googleConnected
            ? `Your personal events · ${googlePersonalCount || "no"} Google Calendar event${googlePersonalCount === 1 ? "" : "s"} (5 past, 5 upcoming)`
            : "Your personal events — connect Google Calendar to pull in recent events"}
      </p>
      {!demo && !googleConnected ? (
        <p className="mt-2 text-sm">
          <a href="/api/auth/google" className="font-medium text-ember underline-offset-2 hover:underline">
            Connect Google Calendar
          </a>{" "}
          to see your personal schedule alongside family events.
        </p>
      ) : null}
      {!demo && googleConnected && view === "mine" ? (
        <p className="mt-2 text-xs text-mute">
          Showing up to 5 past and 5 upcoming events from your Google Calendar.
        </p>
      ) : null}
      {msg ? <p className="mt-2 text-sm text-ember-dark">{msg}</p> : null}

      {view === "family" && needsWeeklyCalls ? (
        <div className={`mt-3 border border-line bg-paper p-3 ${offerWeeklyCalls ? "ring-1 ring-ember" : ""}`}>
          <p className="text-sm font-medium">
            {hasWeeklyCalls ? "Reschedule family calls" : "Schedule weekly family calls"}
          </p>
          <p className="mt-0.5 text-xs text-mute">
            {hasWeeklyCalls
              ? `${weeklyProposal.length} open week${weeklyProposal.length === 1 ? "" : "s"} need${weeklyProposal.length === 1 ? "s" : ""} a call. ${consistentSlotLabel(weeklyProposal)}.`
              : `${consistentSlotLabel(weeklyProposal)}. Hearth finds open times around your existing events${googleConnected ? " and Google Calendar" : ""}.`}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {weeklyProposal.map((e) => (
              <li key={e.startsAt} className="text-mute">
                {proposalCopy(e)}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => void addWeeklyCalls()}
            disabled={schedulingCalls}
            className="mt-2 bg-ember px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {schedulingCalls
              ? "Scheduling…"
              : hasWeeklyCalls
                ? `Reschedule ${weeklyProposal.length} call${weeklyProposal.length === 1 ? "" : "s"}`
                : "Schedule these calls"}
          </button>
        </div>
      ) : null}

      {view === "family" && hasWeeklyCalls && !needsWeeklyCalls ? (
        <p className="mt-2 text-xs text-mute">Weekly family calls are scheduled on the family calendar.</p>
      ) : null}

      <div className="mt-3">
        <label className="sr-only" htmlFor="calendar-clue-search">
          Search calendar by clue
        </label>
        <input
          id="calendar-clue-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search events by name, day, or location…"
          className="w-full border border-line bg-paper px-3 py-2 text-sm"
        />
        {query.trim() ? (
          <p className="mt-1 text-xs text-mute">
            {shown.length ? `${shown.length} matching event${shown.length === 1 ? "" : "s"}` : "No matching events"}
          </p>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between border border-line bg-paper px-3 py-2">
        <button type="button" disabled={monthOff <= monthBounds.minOff} onClick={() => setMonthOff((m) => m - 1)} className="px-2 disabled:opacity-30">←</button>
        <span className="text-sm font-medium">{displayMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
        <button type="button" disabled={monthOff >= monthBounds.maxOff} onClick={() => setMonthOff((m) => m + 1)} className="px-2 disabled:opacity-30">→</button>
      </div>

      <div className="grid grid-cols-7 border-x border-b border-line bg-paper text-center text-xs text-mute">
        {DOW.map((d) => (
          <div key={d} className="border-t border-line py-1.5 font-medium">{d}</div>
        ))}
        {cells.map((d) => {
          const k = localDateKey(d);
          const inMonth = d.getMonth() === displayMonth.getMonth();
          const dayEvents = byDay.get(k) ?? [];
          const isToday = k === todayKey;
          const isPick = pick === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setPick(k)}
              className={`min-h-[68px] border-t border-r border-line p-1 text-left ${!inMonth ? "bg-cream/50 text-mute" : ""} ${isToday ? "ring-1 ring-inset ring-ember" : ""} ${isPick ? "bg-blue-100 ring-2 ring-inset ring-blue-400" : ""}`}
            >
              <span className={`text-sm ${isToday ? "font-bold text-ember" : ""}`}>{d.getDate()}</span>
              <div className="mt-0.5 space-y-0.5">
                {dayEvents.slice(0, 2).map((e) => (
                  <div key={e.id} className={`truncate px-0.5 text-[10px] ${isPick ? "bg-blue-200 font-medium text-blue-900" : "bg-ember/15"}`}>{e.title}</div>
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
        <p className="mb-2 text-xs text-mute">Describe the event — include the day, time, and location.</p>
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
          placeholder={view === "family" ? "e.g. Family dinner Sunday at 6 PM at home" : "e.g. Dentist Tuesday at 3 PM"}
          className={`w-full border border-line px-3 py-2 ${easy ? "min-h-24 text-base" : "min-h-16 text-sm"}`}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {!demo && googleConnected ? (
            <label className="flex items-center gap-1 text-xs text-mute">
              <input type="checkbox" checked={syncToGoogle} onChange={(e) => setSyncToGoogle(e.target.checked)} />
              Also add to Google Calendar
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
