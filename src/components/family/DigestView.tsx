"use client";

import { useFamily } from "@/components/family/FamilyChrome";
import type { Digest } from "@/lib/types";
import { useState } from "react";

export function DigestView({ initial }: { initial: Digest }) {
  const { easy } = useFamily();
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
    const res = await fetch("/api/digest?familyId=alvarez&refresh=1");
    setDigest(await res.json());
    setBusy(false);
  }

  return (
    <article>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ember-dark">Weekly story</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">{digest.title}</h1>
      <p className="mt-2 text-sm text-mute">
        Week of {digest.weekOf} · {digest.source === "llm" ? "written with an LLM" : "stitched on-device for demo"}
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={narrate}
          className={`rounded-full bg-ember px-5 font-semibold text-paper ${easy ? "h-14 text-lg" : "h-11"}`}
        >
          Listen to the week
        </button>
        <button
          type="button"
          onClick={refresh}
          className={`rounded-full border border-line px-5 font-semibold ${easy ? "h-14 text-lg" : "h-11"}`}
        >
          {busy ? "Writing…" : "Regenerate"}
        </button>
      </div>
      <p className={`mt-8 max-w-prose leading-8 ${easy ? "text-xl leading-9" : "text-lg"}`}>{digest.narrative}</p>
      <ul className="mt-8 space-y-2">
        {digest.highlights.map((h) => (
          <li key={h} className="rounded-2xl bg-paper px-4 py-3 text-sm leading-6">
            {h}
          </li>
        ))}
      </ul>
    </article>
  );
}
