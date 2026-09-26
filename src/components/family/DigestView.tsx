"use client";

import { useFamily } from "@/components/family/FamilyChrome";
import { useLargerText, useTimezone } from "@/components/settings/SettingsProvider";
import type { Digest } from "@/lib/types";
import { useState } from "react";

export function DigestView({ initial }: { initial: Digest }) {
  const { me } = useFamily();
  const easy = useLargerText();
  const timeZone = useTimezone();
  const [digest, setDigest] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  function narrate() {
    const u = new SpeechSynthesisUtterance(`${digest.title}. ${digest.narrative}`);
    u.rate = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  async function refresh() {
    setBusy(true);
    setRefreshError(null);
    const res = await fetch(`/api/digest?familyId=${encodeURIComponent(me.familyId)}&refresh=1`);
    if (!res.ok) {
      setRefreshError("Could not rewrite this week. Try again in a moment.");
      setBusy(false);
      return;
    }
    setDigest(await res.json());
    setBusy(false);
  }

  return (
    <article className="max-w-2xl">
      <header className="border-b border-rule pb-4">
        <h1 className={`font-bold ${easy ? "text-2xl" : "text-xl"}`}>{digest.title}</h1>
        <p className="mt-1 text-sm text-mute">
          Week of{" "}
          {new Date(digest.weekOf + "T12:00:00").toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
            timeZone,
          })}
        </p>
        <p className="mt-2 text-sm leading-6 text-mute">
          A short recap from this week&apos;s chats and calendar.
        </p>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={narrate}
          className={`rounded-sm bg-ember px-4 font-medium text-white hover:bg-ember-dark ${easy ? "py-3 text-base" : "py-2 text-sm"}`}
        >
          Listen to this week
        </button>
        <button
          type="button"
          onClick={refresh}
          disabled={busy}
          className={`border border-rule px-4 font-medium disabled:opacity-50 ${easy ? "py-3 text-base" : "py-2 text-sm"}`}
        >
          {busy ? "Rewriting…" : "Rewrite this week"}
        </button>
      </div>

      {refreshError ? (
        <p className="mt-3 text-sm text-red-700" role="alert">{refreshError}</p>
      ) : null}

      <p className={`font-letter mt-6 leading-relaxed ${easy ? "text-lg leading-8" : "text-base leading-7"}`}>
        {digest.narrative}
      </p>

      {digest.highlights.length ? (
        <section className="mt-8 border-t border-rule pt-6">
          <h2 className="text-sm font-bold text-ink">Moments from the week</h2>
          <ul className="mt-3 space-y-3">
            {digest.highlights.map((h) => {
              const [name, ...rest] = h.split(": ");
              const body = rest.join(": ");
              return (
                <li key={h} className="border border-rule p-3">
                  <p className="text-xs font-medium text-ink">{name}</p>
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
