"use client";

import { HearthMark } from "@/components/HearthMark";
<<<<<<< HEAD
import {
  answerFamilyAssistant,
  type AssistantContext,
  type PendingAssistantAction,
} from "@/lib/ai/assistant-local";
=======
import { answerFamilyAssistant, type AssistantContext } from "@/lib/ai/assistant-local";
import type { PendingAssistantAction } from "@/lib/ai/family-tools";
>>>>>>> ebb91a8 (askdjhf)
import { META_MUSE_ATTRIBUTION } from "@/lib/ai/attribution";
import { DIGEST_NAME } from "@/lib/digest-constants";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Turn = {
  role: "user" | "assistant";
  content: string;
  source?: "muse" | "grok" | "local";
  pending?: PendingAssistantAction | null;
};

const STARTERS = [
  "Who is free today?",
  "Add school dropoff on October 1 at 8am",
  "Remind me to call Mom tomorrow",
  `How does ${DIGEST_NAME} work?`,
];

const TURNS_KEY = "hearth-assistant-turns";
const PREVIEW_KEY = "hearth-assistant-preview";

export function defaultAssistantGreeting() {
  return `Hi! I'm Hearth Assistant. I can check the calendar, draft events and reminders, and help with ${DIGEST_NAME}.`;
}

function defaultGreeting() {
  return defaultAssistantGreeting();
}

function clearAssistantSession() {
  try {
    sessionStorage.removeItem(TURNS_KEY);
    sessionStorage.removeItem(PREVIEW_KEY);
  } catch {
    // ignore
  }
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
  authorId,
}: {
  context: AssistantContext;
  easy?: boolean;
  demo?: boolean;
  authorId?: string;
}) {
  const path = usePathname();
  const router = useRouter();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  // Default greeting on SSR + first client paint; restore session after mount.
  const [turns, setTurns] = useState<Turn[]>(() => [{ role: "assistant", content: defaultGreeting() }]);
  const [sessionReady, setSessionReady] = useState(false);
  const [pending, setPending] = useState<PendingAssistantAction | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(TURNS_KEY);
      if (raw?.includes("I can't add it for you") || raw?.includes("Open Calendar then tap Add event")) {
        clearAssistantSession();
        setTurns([{ role: "assistant", content: defaultGreeting() }]);
      } else {
        setTurns(loadTurns());
      }
    } catch {
      setTurns(loadTurns());
    }
    setSessionReady(true);
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    sessionStorage.setItem(TURNS_KEY, JSON.stringify(turns.map(({ pending: _p, ...rest }) => rest)));
    const last = [...turns].reverse().find((t) => t.content.trim());
    if (last) sessionStorage.setItem(PREVIEW_KEY, last.content);
    window.dispatchEvent(new Event("hearth-assistant-preview"));
  }, [turns, sessionReady]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [turns, sending, pending]);

  async function callAssistant(payload: {
    message?: string;
    confirm?: PendingAssistantAction;
    history?: Turn[];
  }) {
    const history = (payload.history ?? turns)
      .filter((turn) => turn.content.trim())
      .slice(-8)
      .map(({ role, content }) => ({ role, content }));
    const response = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: payload.message,
        confirm: payload.confirm,
        history,
        path,
        postingAs: context.postingAs,
        authorId,
      }),
    });
    const result = (await response.json()) as {
      reply?: string;
      source?: "muse" | "grok" | "local";
      pending?: PendingAssistantAction | null;
      error?: string;
    };
    if (!response.ok || !result.reply) throw new Error(result.error || "Assistant unavailable.");
    return result;
  }

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setInput("");
    setSending(true);
    setTurns((prev) => [...prev, { role: "user", content: message }]);

    try {
      const result = await callAssistant({ message, history: turns });
      setPending(result.pending ?? null);
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.reply as string,
          source: result.source ?? "local",
          pending: result.pending ?? null,
        },
      ]);
    } catch {
      const ctx: AssistantContext = { ...context, path };
      setPending(null);
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: answerFamilyAssistant(message, ctx), source: "local" },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function confirmPending() {
    if (!pending || sending) return;
    if (pending.kind === "navigate") {
      router.push(pending.href);
      setPending(null);
      return;
    }
    setSending(true);
    setTurns((prev) => [...prev, { role: "user", content: "Confirm" }]);
    try {
      const result = await callAssistant({ confirm: pending, message: "Confirm" });
      setPending(null);
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.reply as string,
          source: result.source ?? "local",
        },
      ]);
      router.refresh();
    } catch (error) {
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "Could not confirm that action.",
          source: "local",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  const hasUserMessages = turns.some((t) => t.role === "user");
  const activePending = pending;

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
                      : t.source === "grok"
                        ? "Grok fallback"
                        : "Local tools"}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
        {activePending ? (
          <div className="rounded-md border border-accent/40 bg-accent-tint px-3 py-3 text-sm">
            {activePending.kind === "event" ? (
              <>
                <p className="font-semibold text-ink">Draft event</p>
                <p className="mt-1 text-ink">
                  {activePending.title} · {activePending.when}
                  {activePending.location ? ` · ${activePending.location}` : ""}
                </p>
              </>
            ) : null}
            {activePending.kind === "reminder" ? (
              <>
                <p className="font-semibold text-ink">Draft reminder</p>
                <p className="mt-1 text-ink">
                  {activePending.assigneeName}: {activePending.text} · {activePending.dueHint}
                </p>
              </>
            ) : null}
            {activePending.kind === "navigate" ? (
              <>
                <p className="font-semibold text-ink">Open {activePending.label}?</p>
              </>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={sending}
                onClick={() => void confirmPending()}
                className="rounded-sm bg-ember px-3 py-1.5 text-sm font-medium text-white hover:bg-ember-dark disabled:opacity-50"
              >
                {activePending.kind === "navigate" ? "Open" : "Confirm and create"}
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={() => setPending(null)}
                className="rounded-sm border border-rule px-3 py-1.5 text-sm text-mute hover:text-ink"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}
        {sending ? (
          <div className="flex gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-tint">
              <HearthMark className="h-5 w-5" />
            </span>
            <div className="rounded-md border border-rule bg-chat-in px-4 py-2.5 text-sm text-mute" role="status">
              Hearth is working…
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
            placeholder="Ask Hearth to check the calendar or add an event…"
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
