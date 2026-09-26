import { groqDigestStory } from "./ai/digest";
import { groqConfigured } from "./ai/config";
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

function localHighlights(weekPosts: Post[], members: Member[]) {
  const highlights: string[] = [];
  for (const p of weekPosts) {
    const bit = (p.transcript || p.body).slice(0, 110);
    highlights.push(`${by(members, p.authorId)}: ${bit}${bit.length >= 110 ? "…" : ""}`);
  }
  return highlights.slice(-8);
}

/** Sync local fallback (Markov / templates). Prefer `buildDigest` when possible. */
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

  return {
    id: `digest-${familyId}-${weekKey()}`,
    familyId,
    weekOf: weekKey(),
    title,
    narrative: fullNarrative,
    highlights: localHighlights(weekPosts, members),
    theme,
    generatedAt: now(),
    source: "local",
  };
}

/** Groq when `GROQ_API_KEY` is set; otherwise local storyteller. */
export async function buildDigest(
  familyId: string,
  members: Member[],
  posts: Post[],
  events: CalendarEvent[],
): Promise<Digest> {
  const start = startOfWeek();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const weekPosts = posts.filter((p) => {
    const t = new Date(p.createdAt);
    return t >= start && t < end;
  });
  const weekOf = weekKey();

  if (groqConfigured()) {
    const ai = await groqDigestStory({
      posts: weekPosts,
      members,
      events,
      weekOf,
    });
    if (ai) {
      const highlights =
        ai.highlights.length > 0 ? ai.highlights : localHighlights(weekPosts, members);
      return {
        id: `digest-${familyId}-${weekOf}`,
        familyId,
        weekOf,
        title: ai.title,
        narrative: ai.narrative + upcomingSnippet(events, start),
        highlights,
        theme: ai.theme,
        generatedAt: new Date().toISOString(),
        source: "groq",
      };
    }
  }

  return templateDigest(familyId, members, posts, events);
}
