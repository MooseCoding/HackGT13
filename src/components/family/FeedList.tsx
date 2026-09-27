"use client";

import { useHour12, useLargerText, useTimezone } from "@/components/settings/SettingsProvider";
import { formatWhen } from "@/lib/clock";
import type { Member, Post } from "@/lib/types";

export function FeedList({ posts, members }: { posts: Post[]; members: Member[] }) {
  const easy = useLargerText();
  const timeZone = useTimezone();
  const hour12 = useHour12();
  const byId = Object.fromEntries(members.map((m) => [m.id, m]));

  function speak(text: string) {
    void import("@/lib/tts-client").then(({ speakText }) => speakText(text, { rate: 0.92 }));
  }

  return (
    <ol className="mt-6 space-y-6">
      {posts.map((p) => {
        const m = byId[p.authorId];
        const text = p.transcript || p.body;

        if (p.kind === "status") {
          return (
            <li key={p.id} className="border-l-2 border-rule pl-4">
              <p className={`leading-7 text-mute ${easy ? "text-xl leading-9" : "text-[17px]"}`}>
                <span className="font-semibold text-ink">{m?.name.split(" ")[0]}</span>
                {" - "}
                {text}
              </p>
              <p className="mt-1 text-xs text-mute">{formatWhen(p.createdAt, { timeZone, hour12 })}</p>
            </li>
          );
        }

        if (p.kind === "photo" && p.photoUrl) {
          return (
            <li key={p.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.photoUrl}
                alt={p.photoAlt || "Family photo"}
                className="max-h-80 w-full object-cover"
              />
              <p className={`mt-2 leading-7 ${easy ? "text-xl leading-9" : "text-[17px]"}`}>{text}</p>
              <p className="mt-1 text-sm text-mute">
                {m?.name} · {formatWhen(p.createdAt, { timeZone, hour12 })}
              </p>
              <button
                type="button"
                onClick={() => speak(`${m?.name}. ${text}`)}
                className={`mt-2 border border-line px-4 font-semibold ${easy ? "h-12" : "h-9 text-sm"}`}
              >
                Play aloud
              </button>
            </li>
          );
        }

        if (p.kind === "voice") {
          return (
            <li key={p.id} className="border border-line px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                  style={{ background: m?.color ?? "#555555" }}
                >
                  {m?.initials}
                </span>
                <p className="text-sm text-mute">
                  Heard from {m?.name.split(" ")[0]}
                  {p.voiceSeconds ? ` · ${p.voiceSeconds}s` : ""}
                  {p.channel === "whatsapp" ? " · WhatsApp" : ""}
                </p>
                <button
                  type="button"
                  onClick={() => speak(`${m?.name}. ${text}`)}
                  className={`bg-ember px-4 font-semibold text-white hover:bg-ember-dark ${easy ? "h-12 text-base" : "h-9 text-sm"}`}
                >
                  Play aloud
                </button>
              </div>
              <p className={`mt-2 leading-7 text-mute ${easy ? "text-lg leading-8" : "text-[15px]"}`}>
                {text}
              </p>
            </li>
          );
        }

        return (
          <li key={p.id} className="border border-line px-4 py-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <p className="font-semibold">{m?.name}</p>
              <p className="ml-auto text-xs text-mute">{formatWhen(p.createdAt, { timeZone, hour12 })}</p>
            </div>
            <p className={`mt-2 leading-7 ${easy ? "text-xl leading-9" : "text-[17px]"}`}>{text}</p>
            <button
              type="button"
              onClick={() => speak(`${m?.name}. ${text}`)}
              className={`mt-3 border border-line px-4 font-semibold ${easy ? "h-12" : "h-9 text-sm"}`}
            >
              Play aloud
            </button>
          </li>
        );
      })}
    </ol>
  );
}
