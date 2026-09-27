import { dateKey, now } from "./clock";
import { seedPhotos } from "./seed";
import type {
  Digest,
  FamilyId,
  FamilyRadioMeta,
  Member,
  OnThisDayMemory,
  PodcastChapter,
  Post,
  StorybookPage,
} from "./types";

/** Curated On This Day cards - pulled from the same stories/photos as seeded chat. */
const DEMO_ON_THIS_DAY: Record<FamilyId, OnThisDayMemory[]> = {
  alvarez: [
    {
      id: "otd-harvest",
      yearsAgo: 3,
      headline: "3 years ago · harvest day at Elena's",
      story:
        "Tomatoes on the south fence finally came in. Elena made everyone take a bag home whether they wanted one or not. Miguel still has a photo of Ma laughing on the porch.",
      authorName: "Elena",
      originalDate: "2023-09-25",
      photoUrl: seedPhotos.garden,
      photoAlt: "Ripe tomatoes on a vine",
      relatedPostId: "p8",
    },
    {
      id: "otd-lunch",
      yearsAgo: 1,
      headline: "1 year ago · Sunday lunch in the album",
      story:
        "Miguel sorted the Sunday lunch photos. Told Ma the one of her and Sofia is his favorite. Priya had already put the leftovers away.",
      authorName: "Miguel",
      originalDate: "2025-09-25",
      photoUrl: seedPhotos.kitchen,
      photoAlt: "Family dinner plates on a table",
      relatedPostId: "history-2",
    },
    {
      id: "otd-soccer",
      yearsAgo: 2,
      headline: "2 years ago · Sofia's first varsity start",
      story:
        "First varsity start. Abuela wore the yellow scarf. They won 2–1 and Sofia swears the ref smiled when Elena yelled from the sideline.",
      authorName: "Sofia",
      originalDate: "2024-09-25",
      photoUrl: seedPhotos.soccer,
      photoAlt: "Sofia in a soccer jersey on the field",
      relatedPostId: "p2",
    },
  ],
  okonkwo: [
    {
      id: "otd-stew",
      yearsAgo: 2,
      headline: "2 years ago · groundnut stew for Sunday",
      story:
        "Ruth froze two portions and labeled them in her handwriting. Chioma still says that batch had the most pepper.",
      authorName: "Ruth",
      originalDate: "2024-09-25",
      photoUrl: seedPhotos.jollof,
      photoAlt: "Shared meal in a warm kitchen",
      relatedPostId: "r3",
    },
  ],
};

const DEMO_MEMORY_STORYBOOK: Record<FamilyId, StorybookPage[]> = {
  alvarez: [
    {
      id: "mem-garage",
      title: "Abuelo's Sunday ritual",
      caption:
        "Elena told Miguel she still remembers his father polishing the Mustang every Sunday. Engines more than coffee, boleros on the radio.",
      mood: "warm",
    },
    {
      id: "mem-scarf",
      title: "The yellow scarf",
      caption:
        "Abuela wore it to Sofia's game. Said she'd yell loud enough for coach to hear - and she did.",
      mood: "celebration",
    },
  ],
  okonkwo: [
    {
      id: "mem-stew",
      title: "Sunday stew",
      caption: "Ruth labeled two freezer tubs and told Kojo to call when he lands.",
      mood: "warm",
    },
    {
      id: "mem-garden",
      title: "Garden club morning",
      caption: "Tea by the library, a list for next week, and Ruth's voice still holding.",
      mood: "calm",
    },
  ],
};

function memberName(members: Member[], id: string) {
  return members.find((m) => m.id === id)?.name.split(" ")[0] ?? "Someone";
}

function yearsBetween(earlier: Date, later: Date) {
  const diff = later.getTime() - earlier.getTime();
  return Math.max(1, Math.round(diff / (365.25 * 24 * 60 * 60 * 1000)));
}

function yearsAgoLabel(n: number) {
  return n === 1 ? "1 year ago today" : `${n} years ago today`;
}

function localOnThisDay(posts: Post[], members: Member[]): OnThisDayMemory[] {
  const today = dateKey(now());
  const [, month, day] = today.split("-");
  const anchor = new Date(now());

  const matches = posts.filter((p) => {
    const key = dateKey(p.createdAt);
    const [, m, d] = key.split("-");
    if (m !== month || d !== day) return false;
    return Number(key.slice(0, 4)) < anchor.getFullYear();
  });

  return matches.slice(0, 3).map((p) => {
    const years = yearsBetween(new Date(p.createdAt), anchor);
    const name = memberName(members, p.authorId);
    const snippet = (p.transcript || p.body).slice(0, 180);
    return {
      id: `otd-${p.id}`,
      yearsAgo: years,
      headline: `${yearsAgoLabel(years)} · ${name} posted`,
      story: p.photoAlt || snippet,
      authorName: name,
      originalDate: dateKey(p.createdAt),
      photoUrl: p.photoUrl,
      photoAlt: p.photoAlt,
      relatedPostId: p.id,
    };
  });
}

function onThisDayStorybookPages(memories: OnThisDayMemory[]): StorybookPage[] {
  return memories.slice(0, 2).map((m) => ({
    id: `story-${m.id}`,
    title: m.headline,
    caption: m.story,
    photoUrl: m.photoUrl,
    photoAlt: m.photoAlt,
    mood: "warm" as const,
  }));
}

function mergeMemoriesIntoStorybook(
  storybook: StorybookPage[] | undefined,
  onThisDay: OnThisDayMemory[],
  elderPages: StorybookPage[],
): StorybookPage[] {
  const base = storybook ?? [];
  const memoryPages = [...onThisDayStorybookPages(onThisDay), ...elderPages];
  if (!memoryPages.length) return base;

  const divider: StorybookPage = {
    id: "memories-divider",
    title: "From the album",
    caption: "Older posts that matched today's date.",
    mood: "warm",
  };

  const insertAt = Math.min(2, base.length);
  return [...base.slice(0, insertAt), divider, ...memoryPages, ...base.slice(insertAt)];
}

function mergeMemoriesIntoPodcast(
  podcast: PodcastChapter[] | undefined,
  onThisDay: OnThisDayMemory[],
  elderPages: StorybookPage[],
): PodcastChapter[] {
  const base = podcast ?? [];
  const lines = [
    ...onThisDay.slice(0, 2).map((m) => `${m.headline}. ${m.story}`),
    ...elderPages.slice(0, 1).map((p) => `${p.title}. ${p.caption}`),
  ];
  if (!lines.length) return base;

  const chapter: PodcastChapter = {
    id: "on-this-day",
    title: "On this day",
    narration: lines.join(" "),
  };

  const closeIdx = base.findIndex((c) => c.id === "close");
  if (closeIdx >= 0) return [...base.slice(0, closeIdx), chapter, ...base.slice(closeIdx)];
  return [...base, chapter];
}

function demoMemoryHighlights(familyId: FamilyId, onThisDay: OnThisDayMemory[]): string[] {
  if (familyId === "okonkwo") {
    return onThisDay.slice(0, 1).map((m) => `Ruth: ${m.story.split(".")[0]}.`);
  }
  return [
    "Elena: I still remember your grandfather polishing that car every Sunday.",
    ...onThisDay.slice(0, 1).map((m) => `Miguel: ${m.story.split(".")[0]}.`),
  ];
}

function buildFamilyRadioMeta(podcast: PodcastChapter[] | undefined): FamilyRadioMeta {
  const words = (podcast ?? []).reduce((n, c) => n + `${c.title} ${c.narration}`.split(/\s+/).length, 0);
  const minutes = words ? Math.max(1, Math.round(words / 140)) : 2;
  return {
    durationLabel: minutes <= 2 ? "~2 min" : `~${minutes} min`,
    tagline: "Listen to the week if you don't want to read it.",
  };
}

/** Enrich digest with memories woven into storybook, Family Radio, and highlights. */
export function enrichDigestTimeMachine(
  digest: Digest,
  members: Member[],
  posts: Post[],
  demo: boolean,
): Digest {
  const onThisDay = demo ? (DEMO_ON_THIS_DAY[digest.familyId] ?? []) : localOnThisDay(posts, members);
  const elderPages = demo ? (DEMO_MEMORY_STORYBOOK[digest.familyId] ?? []) : [];

  const storybook = mergeMemoriesIntoStorybook(digest.storybook, onThisDay, elderPages);
  const podcast = mergeMemoriesIntoPodcast(digest.podcast, onThisDay, elderPages);
  const audioScript = podcast.map((c) => `${c.title}. ${c.narration}`).join("\n\n");

  const highlights =
    demo && onThisDay.length
      ? [...demoMemoryHighlights(digest.familyId, onThisDay), ...digest.highlights].slice(0, 6)
      : digest.highlights;

  return {
    ...digest,
    onThisDay,
    highlights,
    storybook,
    podcast,
    audioScript,
    familyRadio: buildFamilyRadioMeta(podcast),
  };
}

export { DEMO_ON_THIS_DAY };
