import { startOfWeek } from "./clock";
import type { CalendarEvent, Digest, Member, Post } from "./types";

function weekKey(d = startOfWeek()) {
  return d.toISOString().slice(0, 10);
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
  const by = (id: string) => members.find((m) => m.id === id)?.name ?? "Someone";
  const highlights: string[] = [];
  for (const p of weekPosts) {
    const bit = (p.transcript || p.body).slice(0, 110);
    highlights.push(`${by(p.authorId)}: ${bit}${bit.length >= 110 ? "…" : ""}`);
  }
  const upcoming = events.filter((e) => new Date(e.startsAt) >= start);
  const people = [...new Set(weekPosts.map((p) => by(p.authorId)))];
  const narrative = [
    `This week around the Hearth, ${people.length ? people.join(", ") : "the family"} kept the porch light on even when messages arrived at odd hours.`,
    weekPosts.some((p) => p.kind === "photo")
      ? "Photos made it across town: a kitchen table, a field, a garden still insisting on summer."
      : "The thread was mostly voices and short notes — enough to stitch a Sunday out of fragments.",
    upcoming[0]
      ? `Looking ahead: ${upcoming.map((e) => e.title).join("; ")}.`
      : "The calendar is quiet, which is its own kind of news.",
    "If you only read one thing, read this: nobody has to follow every chat. The week still has a shape, and you are in it.",
  ].join(" ");

  return {
    id: `digest-${familyId}-${weekKey()}`,
    familyId,
    weekOf: weekKey(),
    title: "This week's family story",
    narrative,
    highlights: highlights.slice(-8),
    generatedAt: new Date().toISOString(),
    source: "template",
  };
}

export async function maybeLlmDigest(
  familyId: string,
  members: Member[],
  posts: Post[],
  events: CalendarEvent[],
): Promise<Digest> {
  const fallback = templateDigest(familyId, members, posts, events);
  const key = process.env.GROK_API_KEY || process.env.OPENAI_API_KEY;
  const grok = Boolean(process.env.GROK_API_KEY);
  if (!key) return fallback;

  const start = startOfWeek();
  const weekPosts = posts.filter((p) => new Date(p.createdAt) >= start);
  const prompt = `Write a warm 180-word family newsletter from these posts and events. No medical language. Second person plural ("you").\nPOSTS:\n${weekPosts
    .map((p) => `${p.authorId}: ${p.transcript || p.body}`)
    .join("\n")}\nEVENTS:\n${events.map((e) => `${e.title} @ ${e.startsAt}`).join("\n")}`;

  try {
    const url = grok
      ? "https://api.x.ai/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";
    const model = grok ? "grok-4" : "gpt-4o-mini";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You write intimate, specific family newsletters." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });
    if (!res.ok) return fallback;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const narrative = json.choices?.[0]?.message?.content?.trim();
    if (!narrative) return fallback;
    return { ...fallback, narrative, source: "llm" };
  } catch {
    return fallback;
  }
}
