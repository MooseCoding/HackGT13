"use client";

import { useLargerText, useTimezone } from "@/components/settings/SettingsProvider";
import type { Digest, OnThisDayMemory, StorybookPage } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

const MOOD_BG: Record<string, string> = {
  warm: "bg-accent-tint",
  joyful: "bg-surface",
  calm: "bg-surface",
  celebration: "bg-accent-tint",
};

function StorybookSpread({ page, easy }: { page: StorybookPage; easy: boolean }) {
  const bg = MOOD_BG[page.mood] ?? MOOD_BG.warm;
  return (
    <article className="border border-rule bg-surface">
      <div className={`grid min-h-48 ${bg} p-5 md:grid-cols-2`}>
        <div className="flex flex-col justify-center">
          {page.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={page.photoUrl}
              alt={page.photoAlt || page.title}
              className="max-h-40 w-full rounded-sm object-cover"
            />
          ) : (
            <p className="text-4xl" aria-hidden>{page.illustration ?? "📖"}</p>
          )}
        </div>
        <div className="mt-3 flex flex-col justify-center md:mt-0 md:pl-3">
          <h3 className={`font-bold text-ink ${easy ? "text-lg" : "text-base"}`}>{page.title}</h3>
          <p className={`mt-2 font-letter leading-relaxed text-ink ${easy ? "text-base" : "text-sm"}`}>
            {page.caption}
          </p>
        </div>
      </div>
    </article>
  );
}

function MemoryCard({
  memory,
  easy,
  expanded,
  onToggle,
  timeZone,
}: {
  memory: OnThisDayMemory;
  easy: boolean;
  expanded: boolean;
  onToggle: () => void;
  timeZone: string;
}) {
  return (
    <li className="border border-rule bg-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`flex w-full items-start gap-3 text-left ${easy ? "p-4" : "p-3"}`}
      >
        <span
          aria-hidden
          className={`mt-0.5 shrink-0 text-mute transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          ▾
        </span>
        <span className="min-w-0 flex-1">
          <p className={`font-medium text-ink ${easy ? "text-base" : "text-sm"}`}>{memory.headline}</p>
          {!expanded && memory.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={memory.photoUrl}
              alt=""
              className="mt-2 h-20 w-full rounded-sm object-cover"
            />
          ) : null}
        </span>
      </button>
      {expanded ? (
        <div className={`border-t border-rule ${easy ? "px-4 pb-4 pl-10" : "px-3 pb-3 pl-9"}`}>
          {memory.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={memory.photoUrl}
              alt={memory.photoAlt || memory.headline}
              className="mb-3 max-h-40 w-full rounded-sm object-cover"
            />
          ) : null}
          <p className={`font-letter text-ink ${easy ? "text-base" : "text-sm"}`}>{memory.story}</p>
          <p className="mt-2 text-xs text-mute">
            {memory.authorName} ·{" "}
            {new Date(memory.originalDate + "T12:00:00").toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              timeZone,
            })}
          </p>
        </div>
      ) : null}
    </li>
  );
}

export function DigestView({ initial: digest }: { initial: Digest }) {
  const easy = useLargerText();
  const timeZone = useTimezone();
  const [showStorybook, setShowStorybook] = useState(false);
  const [storyPage, setStoryPage] = useState(0);
  const [expandedMemory, setExpandedMemory] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const cancelRef = useRef(false);

  const podcast = digest.podcast ?? [];
  const storybook = digest.storybook ?? [];
  const onThisDay = digest.onThisDay ?? [];

  useEffect(() => {
    cancelRef.current = false;
    return () => {
      cancelRef.current = true;
      speechSynthesis.cancel();
    };
  }, []);

  async function playFamilyRadio() {
    if (playing) {
      cancelRef.current = true;
      speechSynthesis.cancel();
      setPlaying(false);
      cancelRef.current = false;
      return;
    }

    const script =
      podcast.length > 0
        ? podcast.map((c) => `${c.title}. ${c.narration}`).join(" ")
        : digest.audioScript || `${digest.title}. ${digest.narrative}`;

    speechSynthesis.cancel();
    cancelRef.current = false;
    setPlaying(true);

    await new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(script);
      u.rate = 0.88;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      speechSynthesis.speak(u);
    });

    if (!cancelRef.current) setPlaying(false);
  }

  const btn = easy ? "py-3 px-4 text-base" : "py-2 px-3 text-sm";

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
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={playFamilyRadio}
          className={`rounded-sm font-medium ${playing ? "border border-ember bg-accent-tint text-ink" : "bg-ember text-white hover:bg-ember-dark"} ${btn}`}
        >
          {playing ? "Stop Family Radio" : "Family Radio"}
        </button>
        {storybook.length ? (
          <button
            type="button"
            onClick={() => setShowStorybook((v) => !v)}
            className={`rounded-sm border font-medium ${showStorybook ? "border-ember bg-accent-tint text-ink" : "border-rule text-ink hover:bg-accent-tint"} ${btn}`}
          >
            {showStorybook ? "Hide storybook" : "Storybook"}
          </button>
        ) : null}
      </div>

      {onThisDay.length ? (
        <section className="mt-6">
          <h2 className="text-sm font-bold text-ink">On this day</h2>
          <p className="mt-1 text-sm text-mute">Tap ▾ to open an older post from today&apos;s date.</p>
          <ul className="mt-2 space-y-2">
            {onThisDay.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                easy={easy}
                expanded={expandedMemory === memory.id}
                onToggle={() => setExpandedMemory((id) => (id === memory.id ? null : memory.id))}
                timeZone={timeZone}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <p className={`font-letter mt-6 leading-relaxed ${easy ? "text-lg leading-8" : "text-base leading-7"}`}>
        {digest.narrative}
      </p>

      {digest.highlights.length ? (
        <section className="mt-8 border-t border-rule pt-6">
          <h2 className="text-sm font-bold text-ink">Moments from the week</h2>
          <ul className="mt-3 space-y-2">
            {digest.highlights.map((h) => {
              const [name, ...rest] = h.split(": ");
              const isMemory = h.includes("remember") || h.includes("grandfather") || h.includes("Abuela");
              return (
                <li
                  key={h}
                  className={`border p-3 ${isMemory ? "border-clinic/30 bg-accent-tint/50" : "border-rule"}`}
                >
                  <p className="text-xs font-medium text-ink">{name}</p>
                  <p className={`mt-0.5 text-mute ${easy ? "text-base" : "text-sm"}`}>{rest.join(": ")}</p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {showStorybook && storybook.length ? (
        <section className="mt-8 border-t border-rule pt-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-ink">Storybook</h2>
            <p className="text-xs text-mute">
              {storyPage + 1} / {storybook.length}
            </p>
          </div>
          <StorybookSpread page={storybook[storyPage]} easy={easy} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={storyPage === 0}
              onClick={() => setStoryPage((p) => Math.max(0, p - 1))}
              className="border border-rule px-3 py-1.5 text-sm disabled:opacity-40"
            >
              ←
            </button>
            <button
              type="button"
              disabled={storyPage >= storybook.length - 1}
              onClick={() => setStoryPage((p) => Math.min(storybook.length - 1, p + 1))}
              className="border border-rule px-3 py-1.5 text-sm disabled:opacity-40"
            >
              →
            </button>
          </div>
        </section>
      ) : null}
    </article>
  );
}
