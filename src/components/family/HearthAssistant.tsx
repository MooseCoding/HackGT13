"use client";

import { HearthMark } from "@/components/HearthMark";
import { answerFamilyAssistant, type AssistantContext } from "@/lib/ai/assistant";
import { META_MUSE_ATTRIBUTION } from "@/lib/ai/attribution";
import { DIGEST_NAME } from "@/lib/digest-constants";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Turn = { role: "user" | "assistant"; content: string; source?: "muse" | "groq" | "local" };

const STARTERS = [
  "How do I invite someone?",
  "What's on the calendar?",
  `How does ${DIGEST_NAME} work?`,
  "How do weekly family calls work?",
];

const TURNS_KEY = "hearth-assistant-turns";
const PREVIEW_KEY = "hearth-assistant-preview";

function defaultGreeting() {
  return `Hi! I'm Hearth Assistant. Ask about chats, calendar, ${DIGEST_NAME}, invites, or Larger text.`;
}

function loadTurns(): Turn[] {
  if (typeof window === "undefined") return [{ role: "assistant", content: defaultGreeting() }];
  try {
    const raw = sessionStorage.getItem(TURNS_KEY);
    if (!raw) return [{ role: "assistant", content: defaultGreeting() }];
    const parsed = JSON.parse(raw) as Turn[];
    return parsed.length ? parsed : [{ role: "assistant", content: defaultGreeting() }];
  } catch {
    return [{ role: "assistant", content: defaultGreeting() }];
  }
}

export function assistantPreviewText() {
  if (typeof window === "undefined") return defaultGreeting();
  try {
    return sessionStorage.getItem(PREVIEW_KEY) ?? defaultGreeting();
  } catch {
    return defaultGreeting();
  }
}

export function HearthAssistantChat({
  context,
  easy = false,
  demo = false,
}: {
  context: AssistantContext;
  easy?: boolean;
  demo?: boolean;
}) {
  const path = usePathname();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [turns, setTurns] = useState<Turn[]>(() => loadTurns());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sessionStorage.setItem(TURNS_KEY, JSON.stringify(turns));
    const last = [...turns].reverse().find((t) => t.content.trim());
    if (last) sessionStorage.setItem(PREVIEW_KEY, last.content);
    window.dispatchEvent(new Event("hearth-assistant-preview"));
  }, [turns]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [turns, sending]);

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setInput("");
    setSending(true);
    const history = turns.filter((turn) => turn.content.trim()).slice(-8);
    setTurns((prev) => [...prev, { role: "user", content: message }]);

    try {
      const ctx: AssistantContext = { ...context, path };
      if (demo) {
        setTurns((prev) => [
          ...prev,
          { role: "assistant", content: answerFamilyAssistant(message, ctx), source: "local" },
        ]);
        return;
      }
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, path, postingAs: context.postingAs }),
      });
      const result = (await response.json()) as {
        reply?: string;
        source?: "muse" | "groq" | "local";
        error?: string;
      };
      if (!response.ok || !result.reply) throw new Error(result.error || "Assistant unavailable.");
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: result.reply as string, source: result.source ?? "local" },
      ]);
    } catch {
      const ctx: AssistantContext = { ...context, path };
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: answerFamilyAssistant(message, ctx), source: "local" },
      ]);
    } finally {
      setSending(false);
    }
  }

  const hasUserMessages = turns.some((t) => t.role === "user");

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
        {turns.map((t, i) => {
          const mine = t.role === "user";
          return (
            <div key={`${t.role}-${i}`} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
              {!mine ? (
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-tint">
                  <HearthMark className="h-5 w-5" />
                </span>
              ) : null}
              <div className={`max-w-[85%] ${mine ? "flex flex-col items-end" : ""}`}>
                {!mine ? <p className="mb-0.5 text-xs text-mute">Hearth Assistant</p> : null}
                <div
                  className={`whitespace-pre-wrap leading-relaxed ${
                    mine
                      ? "rounded-md bg-chat-out px-4 py-2.5 text-ink"
                      : "rounded-md border border-rule bg-chat-in px-4 py-2.5 text-ink"
                  } ${easy ? "text-base" : "text-[15px]"}`}
                >
                  {t.content}
                </div>
                {!mine && t.source ? (
                  <span className="mt-1 block text-[10px] font-medium uppercase tracking-wide text-mute">
                    {t.source === "muse"
                      ? META_MUSE_ATTRIBUTION
                      : t.source === "groq"
                        ? "Groq AI"
                        : "Local fallback"}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
        {sending ? (
          <div className="flex gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-tint">
              <HearthMark className="h-5 w-5" />
            </span>
            <div className="rounded-md border border-rule bg-chat-in px-4 py-2.5 text-sm text-mute" role="status">
              Hearth is thinking…
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {!hasUserMessages ? (
        <div className="shrink-0 border-t border-rule bg-surface px-4 py-2">
          <p className={`mb-2 font-medium text-mute ${easy ? "text-sm" : "text-[11px]"}`}>Try asking</p>
          <div className="flex flex-wrap gap-1.5">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className={`rounded-sm border border-rule bg-surface px-2.5 text-ink hover:bg-accent-tint ${
                  easy ? "min-h-10 py-2 text-sm" : "py-1 text-xs"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <form
        className="shrink-0 border-t border-rule bg-surface px-3 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <div className="flex items-end gap-2">
          <label className="sr-only" htmlFor="hearth-assistant-input">
            Message Hearth Assistant
          </label>
          <textarea
            id="hearth-assistant-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask about Hearth…"
            rows={1}
            className={`max-h-28 min-h-[40px] flex-1 resize-none border border-rule bg-surface px-3 py-2 outline-none focus:border-accent ${
              easy ? "text-base" : "text-sm"
            }`}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className={`shrink-0 rounded-sm bg-ember font-medium text-white hover:bg-ember-dark disabled:opacity-50 ${
              easy ? "px-4 py-3 text-base" : "px-4 py-2 text-sm"
            }`}
          >
            {sending ? "…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
