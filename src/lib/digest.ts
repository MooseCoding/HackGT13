import { now, startOfWeek } from "./clock";
import { generateStory } from "./local-ml";
import type { CalendarEvent, Digest, Member, Post } from "./types";

function weekKey(d = startOfWeek()) {
  return d.toISOString().slice(0, 10);
}

function by(members: Member[], id: string) {
  return members.find((m) => m.id === id)?.name ?? "Someone";
}

function upcomingSnippet(events: CalendarEvent[], weekStart: Date): string {
  const upcoming = events.filter((e) => new Date(e.startsAt) >= weekStart);
  if (!upcoming.length) return "";
  const titles = upcoming.slice(0, 3).map((e) => e.title);
  return upcoming.length === 1
    ? ` Coming up: ${titles[0]}.`
    : ` On the calendar: ${titles.join("; ")}${upcoming.length > 3 ? " and more" : ""}.`;
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

  const { title, narrative, theme } = generateStory(weekPosts, members, (id) => by(members, id));
  const fullNarrative = narrative + upcomingSnippet(events, start);

  const highlights: string[] = [];
  for (const p of weekPosts) {
    const bit = (p.transcript || p.body).slice(0, 110);
    highlights.push(`${by(members, p.authorId)}: ${bit}${bit.length >= 110 ? "…" : ""}`);
  }

  return {
    id: `digest-${familyId}-${weekKey()}`,
    familyId,
    weekOf: weekKey(),
    title,
    narrative: fullNarrative,
    highlights: highlights.slice(-8),
    theme,
    generatedAt: now(),
  };
}
