import { aiDigestStory } from "./ai/digest";
import { aiConfigured } from "./ai/config";
import { now, startOfWeek } from "./clock";
import { DIGEST_NAME } from "./digest-constants";
import { enrichDigestMultimodal } from "./digest-multimodal";
import { enrichDigestTimeMachine } from "./digest-time-machine";
import { generateStory, pickWeekHighlights } from "./local-ml";
import type { CalendarEvent, Digest, Member, Post } from "./types";

export { DIGEST_NAME };

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
  return pickWeekHighlights(weekPosts, (id) => by(members, id), 5);
}

function finishDigest(
  base: Digest,
  members: Member[],
  posts: Post[],
  events: CalendarEvent[],
  demo: boolean,
): Digest {
  const multimodal = enrichDigestMultimodal(base, members, posts, events);
  return enrichDigestTimeMachine(multimodal, members, posts, demo);
}

/** Sync local fallback (Markov / templates). Prefer `buildDigest` when possible. */
export function templateDigest(
  familyId: string,
  members: Member[],
  posts: Post[],
  events: CalendarEvent[],
  demo = true,
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

  const base: Digest = {
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
  return finishDigest(base, members, posts, events, demo);
}

/** Meta Muse (preferred) or Groq when configured and `preferLocal` is false; otherwise local storyteller. */
export async function buildDigest(
  familyId: string,
  members: Member[],
  posts: Post[],
  events: CalendarEvent[],
  options?: { demo?: boolean; preferLocal?: boolean },
): Promise<Digest> {
  const demo = options?.demo ?? true;
  const preferLocal = options?.preferLocal ?? false;
  const start = startOfWeek();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const weekPosts = posts.filter((p) => {
    const t = new Date(p.createdAt);
    return t >= start && t < end;
  });
  const weekOf = weekKey();

  if (!preferLocal && aiConfigured()) {
    const ai = await aiDigestStory({
      posts: weekPosts,
      members,
      events,
      weekOf,
    });
    if (ai) {
      const base: Digest = {
        id: `digest-${familyId}-${weekOf}`,
        familyId,
        weekOf,
        title: ai.title,
        narrative: ai.narrative + upcomingSnippet(events, start),
        highlights: ai.highlights.length ? ai.highlights : localHighlights(weekPosts, members),
        theme: ai.theme,
        generatedAt: new Date().toISOString(),
        source: ai.source,
      };
      return finishDigest(base, members, posts, events, demo);
    }
  }

  return templateDigest(familyId, members, posts, events, demo);
}
