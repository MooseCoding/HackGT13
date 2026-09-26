"use client";

import { AddMemberPanel } from "@/components/family/AddMemberPanel";
import { useFamily } from "@/components/family/FamilyChrome";
import { useLargerText, useTimezone } from "@/components/settings/SettingsProvider";
import {
  FAMILY_GC_LABEL,
  familyInitials,
  GROUP_THREAD,
  formatChatTime,
  isGroupThread,
  lastPreview,
  postThreadId,
  threadForDm,
  threadLabel,
} from "@/lib/chat";
import { calendarHintsForText, shouldSuppressCalendarHints, type CalendarChatHint } from "@/lib/chat-calendar-hints";
import { formatWhen } from "@/lib/clock";
import { suggestReminderFromText, type ReminderSuggestion } from "@/lib/remind-detect";
import { suggestScheduleFromText } from "@/lib/schedule-detect";
import { isWeeklyFamilyCall } from "@/lib/family-call-schedule";
import type { CalendarEvent, Member, Post } from "@/lib/types";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M6 1.5a3 3 0 0 0-3 3v2.5L2 8.5h8l-1-1.5V4.5a3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="1" />
      <path d="M5 9.5a1 1 0 0 0 2 0" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <rect x="1" y="2" width="10" height="9" rx="1" stroke="currentColor" strokeWidth="1" />
      <path d="M1 5h10M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function ReminderChip({
  suggestion,
  assigneeName,
  onAdd,
  busy,
  compact,
}: {
  suggestion: ReminderSuggestion;
  assigneeName: string;
  onAdd: () => void;
  busy?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onAdd}
      className={`inline-flex max-w-full items-center gap-1 rounded-sm border border-rule bg-surface px-2 py-0.5 text-[11px] text-clinic hover:bg-accent-tint disabled:opacity-50 ${compact ? "mt-1" : ""}`}
    >
      <BellIcon className="shrink-0" />
      <span className="truncate">
        Add reminder for {assigneeName}
        <span className="text-mute"> · {suggestion.dueHint}</span>
      </span>
    </button>
  );
}

function CalendarHintChips({ hints, compact }: { hints: CalendarChatHint[]; compact?: boolean }) {
  if (!hints.length) return null;
  return (
    <div className={`flex flex-wrap gap-1 ${compact ? "mt-1" : ""}`}>
      {hints.map((h) => (
        <Link
          key={h.event.id}
          href="/family/calendar"
          className="inline-flex max-w-full items-center gap-1 rounded-sm border border-rule bg-surface px-2 py-0.5 text-[11px] text-clinic hover:underline"
        >
          <CalendarIcon className="shrink-0" />
          <span className="truncate">
            On the calendar: {h.label}
            <span className="text-mute"> · {h.when}</span>
            {h.clues?.length ? <span className="text-mute"> · {h.clues.slice(0, 2).join(", ")}</span> : null}
          </span>
        </Link>
      ))}
    </div>
  );
}

function Avatar({ member, size = 40 }: { member?: Member; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
      style={{ width: size, height: size, background: member?.color ?? "#8696a0" }}
    >
      {member?.initials ?? "?"}
    </span>
  );
}

export function ChatApp({
  posts,
  members,
  familyName,
  events = [],
}: {
  posts: Post[];
  members: Member[];
  familyName: string;
  events?: CalendarEvent[];
}) {
  const { me } = useFamily();
  const easy = useLargerText();
  const timeZone = useTimezone();
  const router = useRouter();
  const searchParams = useSearchParams();
  const withParam = searchParams.get("with") ?? GROUP_THREAD;
  const threadId = withParam === GROUP_THREAD ? GROUP_THREAD : threadForDm(me.id, withParam);
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"text" | "voice" | "photo" | "status">("text");
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(withParam === GROUP_THREAD);
  const [showAddMember, setShowAddMember] = useState(false);
  const [scheduleHint, setScheduleHint] = useState<{
    title: string;
    suggestedText: string;
    reason: string;
    weeklyFamilyCall?: boolean;
  } | null>(null);
  const [calendarAdded, setCalendarAdded] = useState<{ title: string; when: string; count?: number } | null>(
    null,
  );
  const [reminderHint, setReminderHint] = useState<ReminderSuggestion | null>(null);
  const [reminderAdded, setReminderAdded] = useState<{ text: string; who: string; when: string } | null>(null);
  const [addingReminder, setAddingReminder] = useState(false);
  const hasWeeklyCalls = events.some(isWeeklyFamilyCall);
  const bottomRef = useRef<HTMLDivElement>(null);
  const byId = Object.fromEntries(members.map((m) => [m.id, m]));

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [router]);

  const threads = useMemo(() => {
    const list: {
      id: string;
      key: string;
      label: string;
      preview: string;
      time: string;
      sortAt: string;
      avatar?: Member;
    }[] = [
      {
        id: GROUP_THREAD,
        key: GROUP_THREAD,
        label: FAMILY_GC_LABEL,
        preview: familyName,
        time: "",
        sortAt: "",
      },
    ];
    for (const m of members) {
      if (m.id === me.id) continue;
      const tid = threadForDm(me.id, m.id);
      list.push({ id: tid, key: m.id, label: m.name, preview: "", time: "", sortAt: "", avatar: m });
    }
    for (const item of list) {
      const threadPosts = posts
        .filter((p) => postThreadId(p) === item.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const last = threadPosts[0];
      if (last) {
        item.preview = lastPreview(last);
        item.time = formatChatTime(last.createdAt, timeZone);
        item.sortAt = last.createdAt;
      } else if (item.key === GROUP_THREAD) {
        item.preview = familyName;
      }
    }
    list.sort((a, b) => {
      if (a.id === GROUP_THREAD) return -1;
      if (b.id === GROUP_THREAD) return 1;
      return b.sortAt.localeCompare(a.sortAt);
    });
    return list;
  }, [posts, members, me.id, familyName, timeZone]);

  const messages = useMemo(
    () =>
      posts
        .filter((p) => postThreadId(p) === threadId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [posts, threadId],
  );

  const lastThreadText = messages.length
    ? messages[messages.length - 1].transcript || messages[messages.length - 1].body
    : "";
  const draftSchedule = useMemo(
    () =>
      body.trim()
        ? suggestScheduleFromText(body, members, events, { familyId: me.familyId, createdBy: me.id })
        : null,
    [body, members, events, me.familyId, me.id],
  );
  const draftHints = useMemo(() => {
    if (!body.trim() || draftSchedule || shouldSuppressCalendarHints(body)) return [];
    return calendarHintsForText(body, events, lastThreadText);
  }, [body, events, lastThreadText, draftSchedule]);
  const draftReminder = useMemo(
    () => (body.trim() ? suggestReminderFromText(body, members, me.id) : null),
    [body, members, me.id],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, threadId]);

  const headerTitle = threadLabel(threadId, me.id, members, familyName);
  const headerMember = isGroupThread(threadId) ? undefined : members.find((m) => m.id === withParam);

  function openThread(key: string) {
    const q = key === GROUP_THREAD ? "" : `?with=${key}`;
    router.push(`/family${q}`);
    setMobileShowChat(true);
  }

  function startVoice() {
    const w = window as Window & {
      SpeechRecognition?: new () => BrowserRec;
      webkitSpeechRecognition?: new () => BrowserRec;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setVoiceError("Voice is not available in this browser. Type your message instead.");
      return;
    }
    setVoiceError(null);
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.onresult = (ev) => {
      setBody(Array.from(ev.results).map((r) => r[0].transcript).join(" "));
      setKind("voice");
    };
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  }

  function onPhoto(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(String(reader.result));
      setKind("photo");
    };
    reader.readAsDataURL(file);
  }

  async function createReminder(suggestion: ReminderSuggestion, sourcePostId?: string) {
    setAddingReminder(true);
    const assignee = members.find((m) => m.id === suggestion.assigneeId);
    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familyId: me.familyId,
        authorId: me.id,
        assigneeId: suggestion.assigneeId,
        text: suggestion.text,
        dueAt: suggestion.dueAt,
        dueHint: suggestion.dueHint,
        sourceText: suggestion.sourceText,
        sourcePostId,
      }),
    });
    setAddingReminder(false);
    if (res.ok) {
      setReminderAdded({
        text: suggestion.text,
        who: assignee?.name.split(" ")[0] ?? "someone",
        when: suggestion.dueHint,
      });
      setReminderHint(null);
      router.refresh();
    }
  }

  async function send() {
    const text = body.trim();
    if (!text && !photoUrl) return;
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familyId: me.familyId,
        authorId: me.id,
        threadId,
        kind,
        body: text || (kind === "photo" ? "Photo" : "Voice note"),
        photoUrl,
        transcript: kind === "voice" ? text : undefined,
        voiceSeconds: kind === "voice" ? Math.max(4, Math.round(text.split(" ").length / 2)) : undefined,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      scheduleSuggestion?: { title: string; suggestedText: string; reason: string; weeklyFamilyCall?: boolean };
      reminderSuggestion?: ReminderSuggestion;
      calendarEvent?: CalendarEvent;
      calendarEvents?: CalendarEvent[];
      id?: string;
    };
    setScheduleHint(data.scheduleSuggestion ?? null);
    setReminderHint(data.reminderSuggestion ?? null);
    if (data.calendarEvent) {
      setCalendarAdded({
        title: data.calendarEvent.title,
        when: formatWhen(data.calendarEvent.startsAt, { timeZone }),
        count: data.calendarEvents?.length,
      });
    } else {
      setCalendarAdded(null);
    }
    setBody("");
    setPhotoUrl(undefined);
    setKind("text");
    router.refresh();
  }

  function speak(text: string) {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.92;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  return (
    <div className="chat-surface grid h-[calc(100dvh-72px)] overflow-hidden md:h-[calc(100dvh-80px)] md:grid-cols-[20rem_minmax(0,1fr)]">
      {/* Thread list — left column on desktop */}
      <aside
        className={`border-r border-white/40 bg-transparent md:block ${
          mobileShowChat ? "hidden" : "block"
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/40 px-4 py-3">
          <h1 className="text-lg font-semibold">Chats</h1>
          <button
            type="button"
            onClick={() => setShowAddMember(true)}
            className="min-h-10 shrink-0 px-2 text-sm font-semibold text-ember hover:underline"
          >
            + Add member
          </button>
        </div>
        <ul>
          {threads.map((t) => {
            const active = threadId === t.id;
            const param = t.key === GROUP_THREAD ? GROUP_THREAD : t.key;
            const isActive =
              active ||
              (param === GROUP_THREAD && withParam === GROUP_THREAD) ||
              (param !== GROUP_THREAD && withParam === param);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => openThread(t.key)}
                  className={`flex w-full items-center gap-3 border-b border-white/40 px-4 py-3 text-left hover:bg-white/60 ${
                    isActive ? "bg-white/60" : ""
                  }`}
                >
                  {t.key === GROUP_THREAD ? (
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-ember text-sm font-semibold text-white">
                      {familyInitials(familyName)}
                    </span>
                  ) : (
                    <Avatar member={t.avatar} size={40} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate font-medium">{t.label}</p>
                      {t.time ? <span className="shrink-0 text-xs text-mute">{t.time}</span> : null}
                    </div>
                    <p className="truncate text-sm text-mute">{t.preview || "No messages yet"}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Conversation — right column on desktop */}
      <div className={`flex min-w-0 flex-col ${mobileShowChat ? "flex" : "hidden md:flex"}`}>
        <div className="px-3 pt-3">
          <div className="glass flex items-center gap-3 rounded-2xl px-4 py-2.5">
            <button
              type="button"
              className="text-sm text-ember md:hidden"
              onClick={() => setMobileShowChat(false)}
            >
              ← Back
            </button>
            {headerMember ? <Avatar member={headerMember} size={36} /> : null}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{headerTitle}</p>
              {isGroupThread(threadId) ? (
                <p className="text-xs text-mute">{familyName} · {members.map((m) => m.name.split(" ")[0]).join(", ")}</p>
              ) : (
                <p className="text-xs text-mute">{headerMember?.role}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-transparent px-4 py-4">
          {messages.map((p, i) => {
            const mine = p.authorId === me.id;
            const author = byId[p.authorId];
            const text = p.transcript || p.body;
            const prior = i > 0 ? messages[i - 1].transcript || messages[i - 1].body : "";
            const scheduleProposal = suggestScheduleFromText(text, members, events, {
              familyId: me.familyId,
              createdBy: p.authorId,
            });
            const reminderProposal = suggestReminderFromText(text, members, p.authorId);
            const assigneeName =
              members.find((m) => m.id === reminderProposal?.assigneeId)?.name.split(" ")[0] ?? "";
            const hints =
              scheduleProposal || shouldSuppressCalendarHints(text)
                ? []
                : calendarHintsForText(text, events, prior);

            if (mine) {
              return (
                <div key={p.id} className="flex items-end justify-end gap-2">
                  <div className="flex max-w-[75%] flex-col items-end">
                    <p className="mb-0.5 text-xs text-mute">
                      {author?.name} · {formatChatTime(p.createdAt, timeZone)}
                    </p>
                    <div className="glass max-w-full rounded-2xl rounded-br-md bg-chat-out/80 px-4 py-2.5">
                      {p.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.photoUrl} alt={p.photoAlt || ""} className="mb-1 max-h-48 rounded-xl object-cover" />
                      ) : null}
                      {p.kind === "voice" ? (
                        <button
                          type="button"
                          onClick={() => speak(`${author?.name}. ${text}`)}
                          className="flex items-center gap-2 text-sm font-medium text-ember hover:underline"
                        >
                          ▶ Voice {p.voiceSeconds ? `(${p.voiceSeconds}s)` : ""}
                        </button>
                      ) : (
                        <p className={`whitespace-pre-wrap leading-relaxed ${easy ? "text-base" : "text-[15px]"}`}>
                          {text}
                        </p>
                      )}
                    </div>
                    <CalendarHintChips hints={hints} compact />
                    {reminderProposal && assigneeName ? (
                      <ReminderChip
                        suggestion={reminderProposal}
                        assigneeName={assigneeName}
                        onAdd={() => createReminder(reminderProposal, p.id)}
                        busy={addingReminder}
                        compact
                      />
                    ) : null}
                    {scheduleProposal ? (
                      <p className="mt-1 text-right text-[11px] text-clinic">
                        {scheduleProposal.weeklyFamilyCall
                          ? `Reply “sure” to ${hasWeeklyCalls ? "reschedule" : "schedule"} weekly family calls on the calendar`
                          : "Reply “sure” to put this on the family calendar"}
                      </p>
                    ) : null}
                  </div>
                  <Avatar member={author} size={32} />
                </div>
              );
            }

            return (
              <div key={p.id} className="flex justify-start gap-2">
                <Avatar member={author} size={32} />
                <div className="max-w-[85%]">
                  <p className="mb-0.5 text-xs text-mute">
                    {author?.name} · {formatChatTime(p.createdAt, timeZone)}
                  </p>
                  <div className="glass rounded-2xl rounded-tl-md px-4 py-2.5">
                    {p.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photoUrl} alt={p.photoAlt || ""} className="mb-1 max-h-48 rounded-xl object-cover" />
                    ) : null}
                    {p.kind === "voice" ? (
                      <button
                        type="button"
                        onClick={() => speak(`${author?.name}. ${text}`)}
                        className="flex items-center gap-2 text-sm font-medium text-ember hover:underline"
                      >
                        ▶ Voice {p.voiceSeconds ? `(${p.voiceSeconds}s)` : ""}
                      </button>
                    ) : (
                      <p className={`whitespace-pre-wrap leading-relaxed ${easy ? "text-base" : "text-[15px]"}`}>
                        {text}
                      </p>
                    )}
                  </div>
                  <CalendarHintChips hints={hints} compact />
                  {reminderProposal && assigneeName ? (
                    <ReminderChip
                      suggestion={reminderProposal}
                      assigneeName={assigneeName}
                      onAdd={() => createReminder(reminderProposal, p.id)}
                      busy={addingReminder}
                      compact
                    />
                  ) : null}
                  {scheduleProposal ? (
                    <p className="mt-1 text-[11px] text-clinic">
                      {scheduleProposal.weeklyFamilyCall
                        ? `Reply “sure” to ${hasWeeklyCalls ? "reschedule" : "schedule"} weekly family calls on the calendar`
                        : "Reply “sure” to put this on the family calendar"}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {reminderAdded ? (
          <div className="mx-3 mb-2 border border-rule bg-accent-tint px-3 py-2 text-sm">
            <p className="font-medium text-ink">
              Reminder for {reminderAdded.who}: {reminderAdded.text}
            </p>
            <p className="text-xs text-mute">{reminderAdded.when}</p>
            <div className="mt-1 flex gap-3">
              <Link href="/family/reminders" className="font-medium text-clinic hover:underline">
                View reminders
              </Link>
              <button type="button" onClick={() => setReminderAdded(null)} className="text-mute hover:text-ink">
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {reminderHint ? (
          <div className="mx-3 mb-2 border border-rule bg-surface px-3 py-2 text-sm">
            <p className="font-medium text-ink">
              Add reminder for {members.find((m) => m.id === reminderHint.assigneeId)?.name.split(" ")[0]}?
            </p>
            <p className="text-xs text-mute">
              {reminderHint.text} · {reminderHint.dueHint}
            </p>
            <div className="mt-1 flex gap-3">
              <button
                type="button"
                disabled={addingReminder}
                onClick={() => createReminder(reminderHint)}
                className="font-medium text-clinic hover:underline disabled:opacity-50"
              >
                Add reminder
              </button>
              <Link href="/family/reminders" className="text-mute hover:text-ink">
                Reminders tab
              </Link>
              <button type="button" onClick={() => setReminderHint(null)} className="text-mute hover:text-ink">
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {calendarAdded ? (
          <div className="mx-3 mb-2 border border-rule bg-accent-tint px-3 py-2 text-sm">
            <p className="font-medium text-ink">
              Added to calendar{calendarAdded.count && calendarAdded.count > 1 ? ` (${calendarAdded.count} events)` : ""}:{" "}
              {calendarAdded.title}
            </p>
            <p className="text-xs text-mute">{calendarAdded.when}</p>
            <div className="mt-1 flex gap-3">
              <Link href="/family/calendar" className="font-medium text-clinic hover:underline">
                View calendar
              </Link>
              <button type="button" onClick={() => setCalendarAdded(null)} className="text-mute hover:text-ink">
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {scheduleHint ? (
          <div className="mx-3 mb-2 border border-rule bg-surface px-3 py-2 text-sm">
            <p className="font-medium text-ink">Add to calendar? {scheduleHint.title}</p>
            <p className="text-xs text-mute">
              {scheduleHint.reason} Or have someone reply &ldquo;sure&rdquo; in the chat.
            </p>
            <div className="mt-1 flex gap-3">
              <a
                href={
                  scheduleHint.weeklyFamilyCall
                    ? "/family/calendar?autoCall=1"
                    : `/family/calendar?draft=${encodeURIComponent(scheduleHint.suggestedText)}`
                }
                className="font-medium text-clinic hover:underline"
              >
                {scheduleHint.weeklyFamilyCall
                  ? hasWeeklyCalls
                    ? "Reschedule weekly calls"
                    : "Schedule weekly calls"
                  : "Add to calendar"}
              </a>
              <button type="button" onClick={() => setScheduleHint(null)} className="text-mute hover:text-ink">
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {draftHints.length ? (
          <div className="mx-3 mb-2 border border-rule bg-surface px-3 py-2">
            <p className="mb-1 text-[11px] font-medium text-mute">On the calendar</p>
            <CalendarHintChips hints={draftHints} />
          </div>
        ) : null}

        {draftReminder && !draftSchedule ? (
          <div className="mx-3 mb-2 border border-rule bg-surface px-3 py-2">
            <p className="mb-1 text-[11px] font-medium text-mute">Reminder suggestion</p>
            <ReminderChip
              suggestion={draftReminder}
              assigneeName={members.find((m) => m.id === draftReminder.assigneeId)?.name.split(" ")[0] ?? "someone"}
              onAdd={() => createReminder(draftReminder)}
              busy={addingReminder}
            />
          </div>
        ) : null}

        {photoUrl ? (
          <div className="px-3">
            <div className="glass inline-block rounded-2xl p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="Preview" className="h-20 rounded-xl object-cover" />
            </div>
          </div>
        ) : null}

        <div className="px-3 pb-3">
          {voiceError ? (
            <p className="mb-2 text-sm text-red-700" role="alert">{voiceError}</p>
          ) : null}
          <div className="glass flex items-end gap-1 rounded-2xl px-3 py-2">
            <label
              className="cursor-pointer rounded-lg px-1.5 py-2 text-ember-dark/70 hover:bg-[#128c7e]/10 hover:text-ember-dark"
              title="Attach a photo"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} />
            </label>
            <button
              type="button"
              onClick={startVoice}
              title="Dictate a message"
              className={`rounded-lg px-1.5 py-2 ${listening ? "bg-[#128c7e]/10 text-ember" : "text-ember-dark/70 hover:bg-[#128c7e]/10 hover:text-ember-dark"}`}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
                <line x1="12" y1="18" x2="12" y2="22" />
              </svg>
            </button>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Type a message"
              rows={1}
              className={`max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border border-[#128c7e]/25 bg-[#128c7e]/[.07] px-3 py-2 outline-none placeholder:text-mute focus:border-ember ${
                easy ? "text-base" : "text-sm"
              }`}
            />
            <button
              type="button"
              onClick={send}
              className={`rounded-xl bg-ember px-4 font-medium text-white hover:bg-ember-dark ${easy ? "py-3 text-base" : "py-2 text-sm"}`}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {showAddMember ? (
        <AddMemberPanel
          familyId={me.familyId}
          onClose={() => setShowAddMember(false)}
          onChanged={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}

type BrowserRec = {
  lang: string;
  interimResults: boolean;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
};
