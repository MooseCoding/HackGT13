"use client";

import { AddMemberPanel } from "@/components/family/AddMemberPanel";
import { useFamily } from "@/components/family/FamilyChrome";
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
import { suggestScheduleFromText } from "@/lib/schedule-detect";
import { isWeeklyFamilyCall } from "@/lib/family-call-schedule";
import type { CalendarEvent, Member, Post } from "@/lib/types";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

function CalendarHintChips({ hints, compact }: { hints: CalendarChatHint[]; compact?: boolean }) {
  if (!hints.length) return null;
  return (
    <div className={`flex flex-wrap gap-1 ${compact ? "mt-1" : ""}`}>
      {hints.map((h) => (
        <Link
          key={h.event.id}
          href="/family/calendar"
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-ember/30 bg-paper px-2 py-0.5 text-[11px] text-ember-dark hover:bg-cream"
        >
          <span aria-hidden>📅</span>
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
  const { me, easy } = useFamily();
  const router = useRouter();
  const searchParams = useSearchParams();
  const withParam = searchParams.get("with") ?? GROUP_THREAD;
  const threadId = withParam === GROUP_THREAD ? GROUP_THREAD : threadForDm(me.id, withParam);
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"text" | "voice" | "photo" | "status">("text");
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [listening, setListening] = useState(false);
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
        item.time = formatChatTime(last.createdAt);
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
  }, [posts, members, me.id, familyName]);

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
      setBody((b) => b || "Voice not available — type instead.");
      return;
    }
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
      calendarEvent?: CalendarEvent;
      calendarEvents?: CalendarEvent[];
    };
    setScheduleHint(data.scheduleSuggestion ?? null);
    if (data.calendarEvent) {
      setCalendarAdded({
        title: data.calendarEvent.title,
        when: formatWhen(data.calendarEvent.startsAt),
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
    <div className="chat-surface flex h-[calc(100dvh-52px)] overflow-hidden md:h-[calc(100dvh-56px)]">
      {/* Sidebar */}
      <aside
        className={`w-full shrink-0 border-r border-white/50 bg-white/40 backdrop-blur-xl md:block md:w-80 ${
          mobileShowChat ? "hidden" : "block"
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/50 px-4 py-3">
          <h1 className="text-lg font-semibold">Chats</h1>
          <button
            type="button"
            onClick={() => setShowAddMember(true)}
            className="min-h-10 shrink-0 rounded-sm px-2 text-sm font-semibold text-ember hover:bg-white/50"
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

      {/* Chat pane */}
      <div className={`flex min-w-0 flex-1 flex-col ${mobileShowChat ? "flex" : "hidden md:flex"}`}>
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
            const showName = isGroupThread(threadId) && !mine;
            const prior = i > 0 ? messages[i - 1].transcript || messages[i - 1].body : "";
            const scheduleProposal = suggestScheduleFromText(text, members, events, {
              familyId: me.familyId,
              createdBy: p.authorId,
            });
            const hints =
              scheduleProposal || shouldSuppressCalendarHints(text)
                ? []
                : calendarHintsForText(text, events, prior);

            if (mine) {
              return (
                <div key={p.id} className="flex items-end justify-end gap-2">
                  <div className="flex max-w-[75%] flex-col items-end">
                    <div className="glass rounded-2xl rounded-br-md px-4 py-2.5">
                      {p.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.photoUrl} alt={p.photoAlt || ""} className="mb-1 max-h-48 rounded-xl object-cover" />
                      ) : null}
                      {p.kind === "voice" ? (
                        <button
                          type="button"
                          onClick={() => speak(`${author?.name}. ${text}`)}
                          className="flex items-center gap-2 text-sm font-medium text-ember-dark"
                        >
                          ▶ Voice {p.voiceSeconds ? `(${p.voiceSeconds}s)` : ""}
                        </button>
                      ) : (
                        <p className={`whitespace-pre-wrap leading-relaxed ${easy ? "text-base" : "text-[15px]"}`}>
                          {text}
                        </p>
                      )}
                      <p className="mt-1 text-right text-[11px] text-mute">
                        {formatChatTime(p.createdAt)}
                      </p>
                    </div>
                    <CalendarHintChips hints={hints} compact />
                    {scheduleProposal ? (
                      <p className="mt-1 text-right text-[11px] text-ember">
                        {scheduleProposal.weeklyFamilyCall
                          ? `Reply “sure” to ${hasWeeklyCalls ? "reschedule" : "schedule"} weekly family calls`
                          : "Reply “sure” to add this to the family calendar"}
                      </p>
                    ) : null}
                  </div>
                  <Avatar member={author} size={32} />
                </div>
              );
            }

            return (
              <div key={p.id} className="flex justify-start">
                <div className="max-w-[85%] items-start">
                  {showName ? (
                    <p className="mb-0.5 ml-1 text-xs font-medium text-ember">{author?.name.split(" ")[0]}</p>
                  ) : null}
                  <div className="px-1 py-1">
                    {p.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photoUrl} alt={p.photoAlt || ""} className="mb-1 max-h-48 rounded-xl object-cover" />
                    ) : null}
                    {p.kind === "voice" ? (
                      <button
                        type="button"
                        onClick={() => speak(`${author?.name}. ${text}`)}
                        className="flex items-center gap-2 text-sm font-medium text-ember-dark"
                      >
                        ▶ Voice {p.voiceSeconds ? `(${p.voiceSeconds}s)` : ""}
                      </button>
                    ) : (
                      <p className={`whitespace-pre-wrap leading-relaxed ${easy ? "text-base" : "text-[15px]"}`}>
                        {text}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-mute">
                      {formatChatTime(p.createdAt)}
                    </p>
                  </div>
                  <CalendarHintChips hints={hints} compact />
                  {scheduleProposal ? (
                    <p className="mt-1 ml-1 text-[11px] text-ember">
                      {scheduleProposal.weeklyFamilyCall
                        ? `Reply “sure” to ${hasWeeklyCalls ? "reschedule" : "schedule"} weekly family calls`
                        : "Reply “sure” to add this to the family calendar"}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {calendarAdded ? (
          <div className="mx-3 mb-2 rounded-2xl border border-ember/30 bg-ember/10 px-3 py-2 text-sm shadow-sm">
            <p className="font-medium text-ink">
              Added to calendar{calendarAdded.count && calendarAdded.count > 1 ? ` (${calendarAdded.count} events)` : ""}:{" "}
              {calendarAdded.title}
            </p>
            <p className="text-xs text-mute">{calendarAdded.when}</p>
            <div className="mt-1 flex gap-3">
              <Link href="/family/calendar" className="font-medium text-ember underline-offset-2 hover:underline">
                View calendar
              </Link>
              <button type="button" onClick={() => setCalendarAdded(null)} className="text-mute hover:text-ink">
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {scheduleHint ? (
          <div className="mx-3 mb-2 rounded-2xl border border-white/60 bg-white/70 px-3 py-2 text-sm shadow-sm">
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
                className="font-medium text-ember underline-offset-2 hover:underline"
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
          <div className="mx-3 mb-2 rounded-2xl border border-white/60 bg-white/70 px-3 py-2">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-mute">
              Calendar reminder
            </p>
            <CalendarHintChips hints={draftHints} />
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
          <div className="glass flex items-end gap-2 rounded-2xl px-3 py-2">
            <label className="cursor-pointer px-1 py-2 text-sm text-mute hover:text-ink">
              📷
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} />
            </label>
            <button
              type="button"
              onClick={startVoice}
              className={`px-1 py-2 text-sm ${listening ? "text-ember" : "text-mute hover:text-ink"}`}
            >
              🎤
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
              className={`max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border border-white/60 bg-white/50 px-3 py-2 outline-none focus:border-ember ${
                easy ? "text-base" : "text-sm"
              }`}
            />
            <button
              type="button"
              onClick={send}
              className={`rounded-xl bg-ember px-4 font-medium text-white ${easy ? "py-3 text-base" : "py-2 text-sm"}`}
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
