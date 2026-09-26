"use client";

import { useFamily } from "@/components/family/FamilyChrome";
import { formatWhen } from "@/lib/clock";
import type { Member, Post } from "@/lib/types";

export function FeedList({ posts, members }: { posts: Post[]; members: Member[] }) {
  const { easy } = useFamily();
  const byId = Object.fromEntries(members.map((m) => [m.id, m]));

  function speak(text: string) {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.92;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  return (
    <ol className="mt-6 space-y-4">
      {posts.map((p) => {
        const m = byId[p.authorId];
        const text = p.transcript || p.body;
        return (
          <li key={p.id} className="rounded-3xl border border-line bg-paper p-5">
            <div className="flex items-start gap-3">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                style={{ background: m?.color ?? "#92400e" }}
              >
                {m?.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <p className="font-semibold">{m?.name}</p>
                  <p className="text-xs text-mute">{m?.role}</p>
                  <p className="ml-auto text-xs text-mute">{formatWhen(p.createdAt)}</p>
                </div>
                <p className={`mt-2 leading-7 ${easy ? "text-xl leading-9" : "text-[17px]"}`}>{text}</p>
                {p.kind === "voice" ? (
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-ember">
                    Voice · {p.voiceSeconds}s
                  </p>
                ) : null}
                {p.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.photoUrl}
                    alt={p.photoAlt || "Family photo"}
                    className="mt-3 max-h-72 w-full rounded-2xl object-cover"
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => speak(`${m?.name}. ${text}`)}
                  className={`mt-3 rounded-full border border-line px-4 font-semibold ${easy ? "h-12" : "h-9 text-sm"}`}
                >
                  Play aloud
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
