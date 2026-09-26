"use client";

import { useFamily } from "@/components/family/FamilyChrome";
import {
  GROUP_THREAD,
  formatChatTime,
  isGroupThread,
  lastPreview,
  postThreadId,
  threadForDm,
  threadLabel,
} from "@/lib/chat";
import type { Member, Post } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";

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
}: {
  posts: Post[];
  members: Member[];
  familyName: string;
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
  const [mobileShowChat, setMobileShowChat] = useState(withParam !== GROUP_THREAD || false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const byId = Object.fromEntries(members.map((m) => [m.id, m]));

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
        label: familyName,
        preview: "",
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
    await fetch("/api/posts", {
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
        <div className="border-b border-white/50 px-4 py-3">
          <h1 className="text-lg font-semibold">Chats</h1>
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
                      AC
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
                <p className="text-xs text-mute">{members.map((m) => m.name.split(" ")[0]).join(", ")}</p>
              ) : (
                <p className="text-xs text-mute">{headerMember?.role}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-transparent px-4 py-4">
          {messages.map((p) => {
            const mine = p.authorId === me.id;
            const author = byId[p.authorId];
            const text = p.transcript || p.body;
            const showName = isGroupThread(threadId) && !mine;

            if (mine) {
              return (
                <div key={p.id} className="flex items-end justify-end gap-2">
                  <div className="glass max-w-[75%] rounded-2xl rounded-br-md px-4 py-2.5">
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
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

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
