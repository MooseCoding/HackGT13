import type {
  CalendarEvent,
  Digest,
  Member,
  PodcastChapter,
  Post,
  StorybookMood,
  StorybookPage,
} from "./types";

const THEME_MOOD: Record<string, StorybookMood> = {
  gathering: "warm",
  outdoors: "joyful",
  care: "calm",
  memory: "warm",
  celebration: "celebration",
  connection: "warm",
};

const THEME_ILLUSTRATION: Record<string, string> = {
  gathering: "🍲",
  outdoors: "🌳",
  care: "💛",
  memory: "📷",
  celebration: "🎉",
  connection: "🏠",
};

function memberName(members: Member[], id: string) {
  return members.find((m) => m.id === id)?.name.split(" ")[0] ?? "Someone";
}

function moodFor(theme?: string): StorybookMood {
  return THEME_MOOD[theme ?? "connection"] ?? "warm";
}

function illustrationFor(theme?: string) {
  return THEME_ILLUSTRATION[theme ?? "connection"] ?? "🏠";
}

function weekOfFrom(weekOf: string) {
  return new Date(weekOf + "T12:00:00");
}

function weekPosts(posts: Post[], weekOf: string) {
  const start = weekOfFrom(weekOf);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return posts.filter((p) => {
    const t = new Date(p.createdAt);
    return t >= start && t < end;
  });
}

function buildPodcast(digest: Digest, weekPostsList: Post[], events: CalendarEvent[], members: Member[]): PodcastChapter[] {
  const chapters: PodcastChapter[] = [
    {
      id: "intro",
      title: "Family Radio — this week on Hestia",
      narration: `Welcome to Family Radio, your two-minute Hestia broadcast. ${digest.title}.`,
    },
    {
      id: "story",
      title: "The week in story",
      narration: digest.narrative,
    },
  ];

  if (digest.highlights.length) {
    chapters.push({
      id: "moments",
      title: "Moments from the week",
      narration: digest.highlights.map((h) => h.replace(": ", " said, ")).join(". "),
    });
  }

  const voices = weekPostsList.filter((p) => p.kind === "voice");
  if (voices.length) {
    chapters.push({
      id: "voices",
      title: "Voice notes from the circle",
      narration: voices
        .slice(0, 3)
        .map((p) => `${memberName(members, p.authorId)} left a voice note: ${(p.transcript || p.body).slice(0, 160)}`)
        .join(". "),
    });
  }

  const upcoming = events.filter((e) => new Date(e.startsAt) >= new Date(weekOfFrom(digest.weekOf)));
  if (upcoming.length) {
    chapters.push({
      id: "calendar",
      title: "Coming up on the calendar",
      narration: upcoming
        .slice(0, 4)
        .map((e) => `${e.title}${e.location ? ` at ${e.location}` : ""}`)
        .join(". "),
    });
  }

  chapters.push({
    id: "close",
    title: "Until next week",
    narration:
      "That's your Family Radio news for this week — about two minutes of warmth from the circle. The hearth stays lit until next time.",
  });

  return chapters;
}

function buildStorybook(
  digest: Digest,
  weekPostsList: Post[],
  events: CalendarEvent[],
  members: Member[],
): StorybookPage[] {
  const mood = moodFor(digest.theme);
  const pages: StorybookPage[] = [
    {
      id: "cover",
      title: digest.title,
      caption: `Week of ${digest.weekOf}`,
      scene: "The hearth glows as the family gathers around this week's story.",
      illustration: illustrationFor(digest.theme),
      mood,
    },
    {
      id: "narrative",
      title: "This week's story",
      caption: digest.narrative,
      scene: "A warm retelling of what happened in the circle.",
      illustration: "📖",
      mood,
    },
  ];

  for (const [i, h] of digest.highlights.slice(0, 4).entries()) {
    const [name, ...rest] = h.split(": ");
    pages.push({
      id: `highlight-${i}`,
      title: name,
      caption: rest.join(": "),
      scene: `${name} had a moment worth remembering.`,
      illustration: ["⭐", "💬", "🌟", "✨"][i % 4],
      mood: i % 2 === 0 ? "joyful" : mood,
    });
  }

  for (const [i, p] of weekPostsList.filter((row) => row.photoUrl).slice(0, 4).entries()) {
    pages.push({
      id: `photo-${p.id}`,
      title: `${memberName(members, p.authorId)} shared a photo`,
      caption: p.photoAlt || p.body || "A moment from the week.",
      photoUrl: p.photoUrl,
      photoAlt: p.photoAlt,
      mood: "joyful",
    });
  }

  const upcoming = events.filter((e) => new Date(e.startsAt) >= weekOfFrom(digest.weekOf));
  if (upcoming.length) {
    pages.push({
      id: "calendar",
      title: "On the calendar",
      caption: upcoming
        .slice(0, 3)
        .map((e) => e.title)
        .join(" · "),
      scene: "Plans ahead for the circle.",
      illustration: "📅",
      mood: "calm",
    });
  }

  pages.push({
    id: "end",
    title: "See you next week",
    caption: "Hestia will be back with another chapter from your circle.",
    scene: "The porch light stays on.",
    illustration: "🕯️",
    mood: "warm",
  });

  return pages;
}

/** Enrich a text digest with podcast chapters and storybook pages. */
export function enrichDigestMultimodal(
  digest: Digest,
  members: Member[],
  posts: Post[],
  events: CalendarEvent[],
): Digest {
  const weekPostsList = weekPosts(posts, digest.weekOf);
  const podcast = buildPodcast(digest, weekPostsList, events, members);
  const storybook = buildStorybook(digest, weekPostsList, events, members);
  const audioScript = podcast.map((c) => `${c.title}. ${c.narration}`).join("\n\n");

  return {
    ...digest,
    podcast,
    storybook,
    audioScript,
  };
}
