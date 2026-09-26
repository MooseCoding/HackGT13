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
      <h1 className="text-xl font-semibold">{digest.title}</h1>
      <p className="mt-1 text-sm text-mute">Week of {digest.weekOf}</p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={narrate}
          className={`bg-ember px-4 font-medium text-white ${easy ? "py-3 text-base" : "py-2 text-sm"}`}
        >
          Listen to this week
        </button>
        <button
          type="button"
          onClick={refresh}
          className={`border border-line px-4 font-medium ${easy ? "py-3 text-base" : "py-2 text-sm"}`}
        >
          {busy ? "Updating…" : "Refresh"}
        </button>
      </div>
      <p className={`mt-6 leading-7 ${easy ? "text-base" : "text-sm"}`}>{digest.narrative}</p>
      {digest.highlights.length ? (
        <ul className="mt-6 space-y-2 border-t border-line pt-4">
          {digest.highlights.map((h) => (
            <li key={h} className="text-sm leading-6 text-mute">
              {h}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
