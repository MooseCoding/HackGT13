"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Turn = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "How do I invite someone?",
  "What’s on the calendar?",
  "How does This week work?",
  "What does clinician sharing mean?",
];

export function HearthAssistant({ familyId }: { familyId: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([
    {
      role: "assistant",
      content:
        "Hi — I’m Hearth Assistant. Ask about chats, calendar, This week, invites, Easy mode, or clinician sharing.",
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [turns, open]);

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    setInput("");
    const prior = turns.slice(-10);
    setTurns((prev) => [...prev, { role: "user", content: message }]);
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          familyId,
          path,
          history: prior,
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string; source?: string };
      const reply =
        data.reply ||
        data.error ||
        "I couldn’t answer just now. Try again, or open Chats / Calendar / This week from the header.";
      setTurns((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong reaching the assistant. Check GROQ_API_KEY or try again." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open ? (
        <section
          className="flex h-[min(70dvh,520px)] w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-lg"
          aria-label="Hearth Assistant"
        >
          <header className="flex items-center justify-between border-b border-line bg-cream px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-ink">Hearth Assistant</p>
              <p className="text-xs text-mute">Chats · Calendar · This week · Care team</p>
            </div>
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
                className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-6 ${
                  t.role === "user"
                    ? "ml-auto bg-ember text-white"
                    : "mr-auto bg-cream text-ink"
                }`}
              >
                {t.content}
              </div>
            ))}
            {busy ? <p className="text-xs text-mute">Thinking…</p> : null}
            <div ref={bottomRef} />
          </div>

          {!turns.some((t) => t.role === "user") ? (
            <div className="flex flex-wrap gap-1.5 border-t border-line px-3 py-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-line bg-cream px-2.5 py-1 text-xs text-ink hover:border-ember"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}

          <form
            className="flex gap-2 border-t border-line p-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
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
              className="min-h-11 flex-1 rounded-xl border border-line bg-paper px-3 text-sm outline-none focus:border-ember"
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="min-h-11 rounded-xl bg-ember px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="min-h-12 rounded-full bg-ember px-5 text-sm font-semibold text-white shadow-md hover:bg-ember-dark"
        aria-expanded={open}
      >
        {open ? "Hide assistant" : "Ask Hearth"}
      </button>
    </div>
  );
}
