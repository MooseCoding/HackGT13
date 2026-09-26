"use client";

import { useFamily } from "@/components/family/FamilyChrome";
import type { Digest } from "@/lib/types";
import { useState } from "react";

export function DigestView({ initial }: { initial: Digest }) {
  const { easy, me } = useFamily();
  const [digest, setDigest] = useState(initial);
  const [busy, setBusy] = useState(false);

  function narrate() {
    const u = new SpeechSynthesisUtterance(`${digest.title}. ${digest.narrative}`);
    u.rate = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  async function refresh() {
    setBusy(true);
    const res = await fetch(`/api/digest?familyId=${encodeURIComponent(me.familyId)}&refresh=1`);
    setDigest(await res.json());
    setBusy(false);
  }

  return (
    <article className="max-w-2xl">
      <header className="border-b border-line pb-4">
        <h1 className={`font-semibold ${easy ? "text-2xl" : "text-xl"}`}>{digest.title}</h1>
        <p className="mt-1 text-sm text-mute">
          Week of{" "}
          {new Date(digest.weekOf + "T12:00:00").toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
          {digest.source === "groq" ? " · Written with Groq" : digest.source === "local" ? " · Local storyteller" : ""}
        </p>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={narrate}
          className={`bg-ember px-4 font-medium text-white ${easy ? "py-3 text-base" : "py-2 text-sm"}`}
        >
          Listen
        </button>
        <button
          type="button"
          onClick={refresh}
          disabled={busy}
          className={`border border-line px-4 font-medium disabled:opacity-50 ${easy ? "py-3 text-base" : "py-2 text-sm"}`}
        >
          {busy ? "Updating…" : "Refresh"}
        </button>
      </div>

      <p className={`mt-6 leading-relaxed ${easy ? "text-lg leading-8" : "text-base leading-7"}`}>{digest.narrative}</p>

      {digest.highlights.length ? (
        <section className="mt-8">
          <h2 className="text-sm font-medium text-mute">Moments from the week</h2>
          <ul className="mt-3 space-y-3">
            {digest.highlights.map((h) => {
              const [name, ...rest] = h.split(": ");
              const body = rest.join(": ");
              return (
                <li key={h} className="border-l-2 border-ember/30 pl-3">
                  <p className="text-xs font-medium text-ember">{name}</p>
                  <p className={`mt-0.5 text-mute ${easy ? "text-base" : "text-sm"}`}>{body}</p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
