import { now, startOfWeek } from "./clock";
import type { CalendarEvent, Digest, Member, Post } from "./types";

function weekKey(d = startOfWeek()) {
  return d.toISOString().slice(0, 10);
}

function by(members: Member[], id: string) {
  return members.find((m) => m.id === id)?.name ?? "Someone";
}

const GENERIC = new Set(["photo", "voice note", "voice"]);

function isGeneric(text: string) {
  return GENERIC.has(text.trim().toLowerCase());
}

function deriveTitle(weekPosts: Post[], members: Member[], weekStart: Date): string {
  const photo = weekPosts.find((p) => p.kind === "photo" && p.body.trim() && !isGeneric(p.body));
  if (photo) {
    const caption = photo.body.trim();
    if (caption.length <= 60) return caption;
    const cut = caption.slice(0, 57);
    return `${cut}…`;
  }

  const words = weekPosts
    .flatMap((p) => (p.transcript || p.body).toLowerCase().split(/\W+/))
    .filter((w) => w.length > 4);
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  const repeated = [...counts.entries()].sort((a, b) => b[1] - a[1]).find(([, n]) => n >= 2);
  if (repeated) {
    const word = repeated[0];
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  const short = weekPosts.find((p) => {
    const t = (p.transcript || p.body).trim();
    return t.length >= 8 && t.length <= 50;
  });
  if (short) return (short.transcript || short.body).trim();

  return `Week of ${weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`;
}

function buildNarrative(
  weekPosts: Post[],
  events: CalendarEvent[],
  members: Member[],
  weekStart: Date,
): string {
  const people = [...new Set(weekPosts.map((p) => by(members, p.authorId)))];
  const photos = weekPosts.filter((p) => p.kind === "photo").length;
  const voices = weekPosts.filter((p) => p.kind === "voice").length;
  const statuses = weekPosts.filter((p) => p.kind === "status").length;
  const texts = weekPosts.filter((p) => p.kind === "text").length;

  const parts: string[] = [];

  if (people.length) {
    const who =
      people.length === 1
        ? people[0]
        : people.length === 2
          ? `${people[0]} and ${people[1]}`
          : `${people.slice(0, -1).join(", ")}, and ${people[people.length - 1]}`;
    parts.push(`${who} checked in this week.`);
  } else {
    parts.push("The porch was quiet this week.");
  }

  const media: string[] = [];
  if (photos) media.push(`${photos} photo${photos > 1 ? "s" : ""}`);
  if (voices) media.push(`${voices} voice note${voices > 1 ? "s" : ""}`);
  if (statuses) media.push(`${statuses} status line${statuses > 1 ? "s" : ""}`);
  if (texts) media.push(`${texts} written note${texts > 1 ? "s" : ""}`);
  if (media.length) parts.push(`There were ${media.join(", ")}.`);

  const upcoming = events.filter((e) => new Date(e.startsAt) >= weekStart);
  if (upcoming.length) {
    const titles = upcoming.slice(0, 3).map((e) => e.title);
    parts.push(
      upcoming.length === 1
        ? `Coming up: ${titles[0]}.`
        : `On the calendar: ${titles.join("; ")}${upcoming.length > 3 ? " and more" : ""}.`,
    );
  }

  const last = weekPosts[weekPosts.length - 1];
  if (last) {
    const snippet = (last.transcript || last.body).slice(0, 80).trim();
    if (snippet) {
      parts.push(`The last word was from ${by(members, last.authorId).split(" ")[0]}: "${snippet}${snippet.length >= 80 ? "…" : ""}"`);
    }
  }

  return parts.join(" ");
}

export function templateDigest(
  familyId: string,
  members: Member[],
  posts: Post[],
  events: CalendarEvent[],
): Digest {
  const start = startOfWeek();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const weekPosts = posts.filter((p) => {
    const t = new Date(p.createdAt);
    return t >= start && t < end;
  });

  const highlights: string[] = [];
  for (const p of weekPosts) {
    const bit = (p.transcript || p.body).slice(0, 110);
    highlights.push(`${by(members, p.authorId)}: ${bit}${bit.length >= 110 ? "…" : ""}`);
  }

  return {
    id: `digest-${familyId}-${weekKey()}`,
    familyId,
    weekOf: weekKey(),
    title: deriveTitle(weekPosts, members, start),
    narrative: buildNarrative(weekPosts, events, members, start),
    highlights: highlights.slice(-8),
    generatedAt: now(),
  };
}
