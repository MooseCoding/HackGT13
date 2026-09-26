"use client";

import { useFamily } from "@/components/family/FamilyChrome";
import { useHour12, useLargerText, useTimezone } from "@/components/settings/SettingsProvider";
import { CAL_WEEKS, localDateKey } from "@/lib/calendar-window";
import { searchEventsByClues } from "@/lib/chat-calendar-hints";
import { calendarAnchor, formatLongDate, formatMonthYear, formatTime } from "@/lib/clock";
import { personalCalendarRows } from "@/lib/demo-personal-calendars";
import {
  DEFAULT_FAMILY_CALL_FREQUENCY,
  FAMILY_CALL_FREQUENCY_OPTIONS,
  familyCallFrequencyLabel,
  familyCallPeriodNoun,
  familyCallSetupHeading,
  type FamilyCallFrequency,
} from "@/lib/family-call-frequency";
import {
  consistentSlotLabel,
  isWeeklyFamilyCall,
  proposalCopy,
  proposeFamilyCalls,
} from "@/lib/family-call-schedule";
import { createSupabaseBrowser } from "@/lib/supabase/browser";
import type { PublicSupabaseConfig } from "@/lib/supabase/public";
import type { CalendarEvent } from "@/lib/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function eventChipClass(e: CalendarEvent): string {
  if (isWeeklyFamilyCall(e)) return "bg-accent-tint font-medium text-ember";
  if (e.isGoogleSynced) return "bg-ground text-clinic";
  return "text-ink";
}

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
  return e.createdBy === meId;
}

export function CalendarBoard({
  familyId,
  supabaseConfig,
  initialDraft = "",
  offerWeeklyCalls = false,
  autoAddFamilyCalls = true,
}: {
  familyId: string;
  supabaseConfig: PublicSupabaseConfig | null;
  initialDraft?: string;
  offerWeeklyCalls?: boolean;
  autoAddFamilyCalls?: boolean;
}) {
  const { me, members } = useFamily();
  const easy = useLargerText();
  const timeZone = useTimezone();
  const hour12 = useHour12();
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
  const [demoPersonalCalendars, setDemoPersonalCalendars] = useState(false);
  const [familyCallFrequency, setFamilyCallFrequency] = useState<FamilyCallFrequency>(DEFAULT_FAMILY_CALL_FREQUENCY);
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

  useEffect(() => {
    if (demo) return;
    fetch("/api/consent/account", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.familyCallFrequency) setFamilyCallFrequency(data.familyCallFrequency);
      })
      .catch(() => {});
  }, [demo]);

  const load = useCallback(async () => {
    const q = new URLSearchParams({ familyId });
    if (googleToken) q.set("googleToken", googleToken);
    const res = await fetch(`/api/events?${q}`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setEvents(data.events);
      setGoogleConnected(Boolean(data.googleConnected));
      setGooglePersonalCount(Number(data.googlePersonalCount ?? 0));
      setDemoPersonalCalendars(Boolean(data.demoPersonalCalendars));
      setEventsLoaded(true);
    }
  }, [familyId, googleToken]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
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
      proposeFamilyCalls(events, {
        familyId,
        createdBy: me.id,
        members,
        anchor,
        frequency: familyCallFrequency,
      }),
    [events, familyId, me.id, members, anchor, familyCallFrequency],
  );

  const hasWeeklyCalls = events.some(isWeeklyFamilyCall);
  const needsWeeklyCalls = familyCallFrequency !== "none" && weeklyProposal.length > 0;

  const personalRows = useMemo(
    () => (demoPersonalCalendars ? personalCalendarRows(events, members, anchor) : []),
    [demoPersonalCalendars, events, members, anchor],
  );
  const personalConflicts = personalRows.filter((r) => r.conflictsSundayCall);
  const myPersonalCount = useMemo(
    () => events.filter((e) => isMineEvent(e, me.id)).length,
    [events, me.id],
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
    "Doctor appointment tomorrow at 9 AM",
    "Family dinner Friday at 6 PM",
    "Video call Sunday at 4 PM",
  ];

  async function updateCallFrequency(next: FamilyCallFrequency) {
    setFamilyCallFrequency(next);
    if (demo) return;
    await fetch("/api/consent/account", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ familyCallFrequency: next }),
    });
  }

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
        setMsg(data.error || "Couldn't set up those calls. Try again.");
        return;
      }
      if (data.warning) {
        setMsg(data.warning);
      } else if (data.count) {
        const g = data.googleSynced ? `, and ${data.googleSynced} ${data.googleSynced === 1 ? "was" : "were"} added to Google Calendar` : "";
        const verb = rescheduling ? "Updated" : "Added";
        const rhythm = familyCallFrequencyLabel(familyCallFrequency).toLowerCase();
        setMsg(`${verb} ${data.count} ${rhythm} family call${data.count === 1 ? "" : "s"} to the calendar${g}.`);
      } else {
        setMsg("No open time in the next few weeks. Check back once things clear up.");
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
        setMsg(data.error || "Couldn't save that. Try again.");
        return;
      }
      if (data.warning) setMsg(data.warning);
      else if (data.googleEventId) {
        setMsg(
          view === "family"
            ? "Saved to the family calendar and Google Calendar."
            : "Saved to your calendar and Google Calendar.",
        );
      } else {
        setMsg(view === "family" ? "Saved to the family calendar." : "Saved to your calendar.");
      }
      setText("");
      setPick(localDateKey(data.startsAt));
      await load();
    } finally {
      setBusy(false);
    }
  }

  const shouldAutoSchedule = offerWeeklyCalls || autoAddFamilyCalls;

  useEffect(() => {
    if (
      !eventsLoaded ||
      !shouldAutoSchedule ||
      !needsWeeklyCalls ||
      autoScheduledRef.current ||
      schedulingCalls
    ) {
      return;
    }
    autoScheduledRef.current = true;
    void addWeeklyCalls();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot after events load
  }, [eventsLoaded, shouldAutoSchedule, needsWeeklyCalls, schedulingCalls]);

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
      if (!res.ok) throw new Error(data.error || "Couldn't remove that event — try again.");
      setEvents((prev) => prev.filter((x) => x.id !== e.id));
      if (pick && picked.length <= 1) setPick(null);
      if (isWeeklyFamilyCall(e)) {
        setMsg("Call removed. Set new times below.");
      } else {
        setMsg("Removed from the calendar.");
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Couldn't remove that event — try again.");
      await load();
    } finally {
      setDeletingId(null);
    }
  }

  const cellMinH = easy ? "min-h-[88px]" : "min-h-[76px]";
  const onCurrentMonth = monthOff === 0;

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-rule pb-4">
        <div>
          <h1 className={`font-bold ${easy ? "text-2xl" : "text-xl"}`}>Calendar</h1>
          <p className="mt-1 text-sm text-mute">
            {view === "family"
              ? demoPersonalCalendars
                ? "Shared plans for your circle. Scheduling also checks personal calendars."
                : "What's coming up for everyone in your circle"
              : googleConnected
                ? demoPersonalCalendars
                  ? myPersonalCount
                    ? `${myPersonalCount} event${myPersonalCount === 1 ? "" : "s"} on your calendar (demo)`
                    : "Your Google Calendar (demo)"
                  : googlePersonalCount
                    ? `${googlePersonalCount} event${googlePersonalCount === 1 ? "" : "s"} from your Google Calendar`
                    : "Your Google Calendar is connected"
                : "Your schedule. Connect Google Calendar to pull events in."}
          </p>
        </div>
        <div
          className="flex shrink-0 overflow-hidden rounded-sm border border-rule text-sm"
          role="tablist"
          aria-label="Calendar view"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === "family"}
            onClick={() => setView("family")}
            className={`min-h-11 px-4 py-1.5 font-medium transition-colors ${view === "family" ? "bg-ember text-white" : "bg-surface hover:bg-ground"}`}
          >
            Family
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "mine"}
            onClick={() => setView("mine")}
            className={`min-h-11 border-l border-rule px-4 py-1.5 font-medium transition-colors ${view === "mine" ? "bg-ember text-white" : "bg-surface hover:bg-ground"}`}
          >
            My calendar
          </button>
        </div>
      </header>

      {!demo && !googleConnected ? (
        <p className="mt-3 text-sm">
          <a href="/api/auth/google" className="font-medium text-clinic underline-offset-2 hover:underline">
            Link Google Calendar
          </a>{" "}
          to show your schedule next to the family&apos;s.
        </p>
      ) : null}

      {msg ? (
        <p className="mt-3 rounded-sm border border-rule bg-accent-tint px-3 py-2 text-sm" role="status">
          {msg}
        </p>
      ) : null}

      {view === "family" && familyCallFrequency !== "none" && (needsWeeklyCalls || hasWeeklyCalls || !demo) ? (
        <div className="mt-4 border border-rule bg-surface p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-medium">
                {needsWeeklyCalls
                  ? familyCallSetupHeading(familyCallFrequency, hasWeeklyCalls)
                  : hasWeeklyCalls
                    ? "Your family calls are all set"
                    : familyCallSetupHeading(familyCallFrequency, false)}
              </p>
              {needsWeeklyCalls ? (
                <p className="mt-1 text-sm text-mute">
                  {hasWeeklyCalls
                    ? `${weeklyProposal.length} ${familyCallPeriodNoun(familyCallFrequency)}${weeklyProposal.length === 1 ? "" : "es"} still need${weeklyProposal.length === 1 ? "s" : ""} a call. ${consistentSlotLabel(weeklyProposal)}.`
                    : `${consistentSlotLabel(weeklyProposal)}. We skip times that are already booked${googleConnected ? ", including your Google Calendar" : ""}.`}
                </p>
              ) : hasWeeklyCalls ? (
                <p className="mt-1 text-sm text-mute">
                  We&apos;ll suggest new call times on your {familyCallFrequencyLabel(familyCallFrequency).toLowerCase()} schedule.
                </p>
              ) : null}
            </div>
            {!demo ? (
              <label className="block shrink-0 text-sm">
                <span className="font-medium text-ink">Call rhythm</span>
                <select
                  value={familyCallFrequency}
                  onChange={(e) => void updateCallFrequency(e.target.value as FamilyCallFrequency)}
                  className="mt-1 min-h-11 w-full rounded-sm border border-rule bg-surface px-3 text-sm sm:min-w-44"
                >
                  {FAMILY_CALL_FREQUENCY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          {needsWeeklyCalls ? (
            <>
              <ul className="mt-3 space-y-1.5 text-sm">
                {weeklyProposal.map((e) => (
                  <li key={e.startsAt} className="flex items-baseline gap-2 text-mute">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ember" aria-hidden="true" />
                    {proposalCopy(e)}
                  </li>
                ))}
              </ul>
              {demoPersonalCalendars && personalRows.length ? (
                <div className="mt-4 border-t border-rule pt-3">
                  <p className="text-sm font-medium">What we skipped</p>
                  <p className="mt-0.5 text-xs text-mute">
                    Demo only. In the real app, other people&apos;s calendars stay private — we only use them to find open slots.
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {personalRows.slice(0, 6).map((row) => (
                      <li key={`${row.memberName}-${row.when}-${row.title}`} className="flex items-baseline gap-2 text-mute">
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${row.conflictsSundayCall ? "bg-clinic" : "bg-rule"}`}
                          aria-hidden="true"
                        />
                        <span>
                          <span className="font-medium text-ink">{row.memberName}</span>
                          {" · "}
                          {row.title}
                          <span className="text-mute"> ({row.when})</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {personalConflicts.length ? (
                    <p className="mt-2 text-xs text-clinic">
                      {personalConflicts.map((r) => `${r.memberName}'s ${r.title.toLowerCase()}`).join(" and ")} overlap
                      the usual Sunday call time, so we skip or move those weeks.
                    </p>
                  ) : null}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => void addWeeklyCalls()}
                disabled={schedulingCalls}
                className="mt-3 rounded-sm bg-ember px-4 py-2 text-sm font-medium text-white hover:bg-ember-dark disabled:opacity-50"
              >
                {schedulingCalls
                  ? "Finding times…"
                  : hasWeeklyCalls
                    ? `Update ${weeklyProposal.length} call${weeklyProposal.length === 1 ? "" : "s"}`
                    : "Add to calendar"}
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {view === "family" && familyCallFrequency === "none" && !demo ? (
        <div className="mt-4 border border-rule bg-surface p-4">
          <p className="font-medium text-ink">Family call rhythm</p>
          <p className="mt-1 text-sm text-mute">Family calls won&apos;t be suggested automatically. You can change that here.</p>
          <label className="mt-3 block text-sm">
            <span className="sr-only">Call rhythm</span>
            <select
              value={familyCallFrequency}
              onChange={(e) => void updateCallFrequency(e.target.value as FamilyCallFrequency)}
              className="min-h-11 w-full rounded-sm border border-rule bg-surface px-3 text-sm sm:max-w-xs"
            >
              {FAMILY_CALL_FREQUENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <div className="mt-5">
        <label className="sr-only" htmlFor="calendar-clue-search">
          Search events
        </label>
        <input
          id="calendar-clue-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search events, days, or places…"
          className={`w-full rounded-sm border border-rule bg-surface px-3 py-2 ${easy ? "text-base" : "text-sm"}`}
        />
        {query.trim() ? (
          <p className="mt-1.5 text-xs text-mute">
            {shown.length ? `${shown.length} event${shown.length === 1 ? "" : "s"} found` : "No matches. Try a different search."}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={monthOff <= monthBounds.minOff}
          onClick={() => setMonthOff((m) => m - 1)}
          aria-label="Previous month"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-rule bg-surface text-lg hover:bg-ground disabled:opacity-30"
        >
          ←
        </button>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <h2 className={`font-semibold ${easy ? "text-lg" : "text-base"}`}>
            {formatMonthYear(displayMonth, { timeZone })}
          </h2>
          {!onCurrentMonth ? (
            <button
              type="button"
              onClick={() => {
                setMonthOff(0);
                setPick(todayKey);
              }}
              className="rounded-sm border border-rule px-2.5 py-1 text-xs font-medium text-clinic hover:bg-ground"
            >
              Today
            </button>
          ) : null}
        </div>
        <button
          type="button"
          disabled={monthOff >= monthBounds.maxOff}
          onClick={() => setMonthOff((m) => m + 1)}
          aria-label="Next month"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-rule bg-surface text-lg hover:bg-ground disabled:opacity-30"
        >
          →
        </button>
      </div>

      <div className="mt-2 overflow-hidden rounded-sm border border-rule bg-surface">
        <div className="grid grid-cols-7 border-b border-rule bg-ground text-center text-xs font-medium text-mute">
          {DOW.map((d) => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const k = localDateKey(d);
            const inMonth = d.getMonth() === displayMonth.getMonth();
            const dayEvents = byDay.get(k) ?? [];
            const isToday = k === todayKey;
            const isPick = pick === k;
            const col = i % 7;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setPick(k)}
                aria-label={`${formatLongDate(localDateKey(d) + "T12:00:00", { timeZone })}${dayEvents.length ? `, ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}` : ""}`}
                aria-pressed={isPick}
                className={[
                  cellMinH,
                  "border-t border-rule p-1.5 text-left transition-colors hover:bg-ground",
                  col < 6 ? "border-r border-rule" : "",
                  !inMonth ? "text-mute/60" : "",
                  isPick ? "bg-accent-tint" : "",
                  isToday && !isPick ? "bg-ground" : "",
                ].join(" ")}
              >
                <div>
                  {isToday ? (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-clinic text-xs font-bold text-white">
                      {d.getDate()}
                    </span>
                  ) : (
                    <span className={`text-sm ${inMonth ? "font-medium" : ""}`}>{d.getDate()}</span>
                  )}
                </div>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 2).map((e) => (
                    <div
                      key={e.id}
                      className={`truncate rounded-sm px-1 py-px text-[10px] leading-tight ${eventChipClass(e)}`}
                      title={e.title}
                    >
                      {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 ? (
                    <div className="px-1 text-[10px] font-medium text-clinic">+{dayEvents.length - 2} more</div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {pick ? (
        <section className="mt-4 border border-rule bg-surface p-4" aria-labelledby="day-detail-heading">
          <h3 id="day-detail-heading" className="font-semibold">
            {formatLongDate(pick + "T12:00:00", { timeZone })}
          </h3>
          {picked.length === 0 ? (
            <p className="mt-2 text-sm text-mute">Nothing scheduled. Add something below.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {picked.map((e) => (
                <li
                  key={e.id}
                  className={`flex items-start justify-between gap-3 rounded-sm border border-rule p-3 ${isWeeklyFamilyCall(e) ? "bg-accent-tint" : "bg-ground"}`}
                >
                  <div className="min-w-0">
                    <p className="font-medium">{e.title}</p>
                    <p className="mt-0.5 text-sm text-mute">
                      {formatTime(e.startsAt, { timeZone, hour12 })}
                      {e.location ? ` · ${e.location}` : ""}
                    </p>
                    {e.isGoogleSynced ? (
                      <p className="mt-1 text-xs text-clinic">Synced from Google Calendar</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(e)}
                    disabled={deletingId === e.id}
                    className="shrink-0 text-xs font-medium text-ember hover:underline disabled:opacity-50"
                  >
                    {deletingId === e.id ? "Removing…" : "Remove from calendar"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <p className="mt-3 text-sm text-mute">Pick a day to see what&apos;s on it.</p>
      )}

      <section className="mt-6 border border-rule bg-surface p-4" aria-labelledby="add-event-heading">
        <h3 id="add-event-heading" className="font-semibold">Add an event</h3>
        <p className="mt-1 text-sm text-mute">Just type it naturally — &quot;family dinner Sunday at 6&quot; works fine.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setText(q)}
              className="rounded-sm border border-rule bg-ground px-2.5 py-1 text-xs font-medium hover:border-ember hover:text-ember"
            >
              {q.split(" at ")[0]}
            </button>
          ))}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={view === "family" ? "Family dinner Sunday at 6, at home" : "Dentist Tuesday at 3 PM"}
          className={`mt-3 w-full rounded-sm border border-rule bg-surface px-3 py-2 ${easy ? "min-h-24 text-base" : "min-h-16 text-sm"}`}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {!demo && googleConnected ? (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-mute">
              <input
                type="checkbox"
                checked={syncToGoogle}
                onChange={(e) => setSyncToGoogle(e.target.checked)}
                className="h-4 w-4 accent-ember"
              />
              Add to Google Calendar too
            </label>
          ) : null}
          <button
            type="button"
            onClick={create}
            disabled={busy || !text.trim()}
            className="ml-auto rounded-sm bg-ember px-5 py-2 text-sm font-medium text-white hover:bg-ember-dark disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save to calendar"}
          </button>
        </div>
      </section>
    </div>
  );
}
