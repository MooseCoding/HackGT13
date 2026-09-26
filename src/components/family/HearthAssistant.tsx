"use client";

import { answerFamilyAssistant, type AssistantContext } from "@/lib/ai/assistant";
import { DIGEST_NAME } from "@/lib/digest";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Turn = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "How do I invite someone?",
  "What's on the calendar?",
  `How does ${DIGEST_NAME} work?`,
  "How do weekly family calls work?",
];

export function HearthAssistant({ context }: { context: AssistantContext }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([
    {
      role: "assistant",
      content: `Hi! I'm Hearth Assistant. Ask about chats, calendar, ${DIGEST_NAME}, invites, or Larger text.`,
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [turns, open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(ev: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(ev.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message) return;
    setInput("");
    const ctx: AssistantContext = {
      ...context,
      path,
    };
    const reply = answerFamilyAssistant(message, ctx);
    setTurns((prev) => [...prev, { role: "user", content: message }, { role: "assistant", content: reply }]);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="min-h-11 rounded-sm border border-white/40 px-3 text-sm font-medium text-white hover:border-white"
        aria-expanded={open}
        aria-controls="hearth-assistant-panel"
      >
        {open ? "Close help" : "Ask Hearth"}
      </button>
      {open ? (
        <section
          id="hearth-assistant-panel"
          className="fixed inset-x-3 top-14 z-50 flex h-[min(60dvh,440px)] flex-col overflow-hidden rounded-sm border border-rule bg-surface sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+0.5rem)] sm:w-[22rem]"
          aria-label="Hearth Assistant"
        >
          <header className="flex items-center justify-between border-b border-rule px-3 py-2">
            <p className="text-sm font-semibold text-ink">Hearth Assistant</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-10 px-2 text-sm text-mute hover:text-ink"
            >
              Close
            </button>
          </header>

          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {turns.map((t, i) => (
              <div
                key={`${t.role}-${i}`}
                className={`max-w-[90%] whitespace-pre-wrap border border-rule px-3 py-2 text-sm leading-6 ${
                  t.role === "user" ? "ml-8 bg-chat-out text-ink" : "mr-auto bg-chat-in text-ink"
                }`}
              >
                {t.content}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {!turns.some((t) => t.role === "user") ? (
            <div className="flex flex-wrap gap-1.5 border-t border-rule px-3 py-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="border border-rule px-2.5 py-1 text-xs text-ink hover:underline"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}

          <form
            className="flex gap-2 border-t border-rule p-2"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <label className="sr-only" htmlFor="hearth-assistant-input">
              Message Hearth Assistant
            </label>
            <input
              id="hearth-assistant-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Hearth…"
              className="min-h-11 flex-1 border border-rule bg-surface px-3 text-sm outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="min-h-11 rounded-sm bg-ember px-4 text-sm font-medium text-white hover:bg-ember-dark disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
