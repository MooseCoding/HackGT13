import { aiChat } from "./chat";
import { aiConfigured } from "./config";
import { parseModelJson } from "./json";
import { DIGEST_SYSTEM_PROMPT } from "./prompts";
import type { AiSource } from "./chat";
import type { CalendarEvent, Member, Post } from "../types";

export type AiDigestDraft = {
  title: string;
  narrative: string;
  highlights: string[];
  theme: string;
  source: AiSource;
};

function memberName(members: Member[], id: string) {
  return members.find((m) => m.id === id)?.name ?? "Someone";
}

function buildUserPayload(
  posts: Post[],
  members: Member[],
  events: CalendarEvent[],
  weekOf: string,
) {
  const postLines = posts.map((p) => {
    const who = memberName(members, p.authorId);
    const text = (p.transcript || p.body).slice(0, 280);
    return `- ${who} (${p.createdAt.slice(0, 10)}): ${text}`;
  });
  const eventLines = events.slice(0, 12).map((e) => {
    const when = new Date(e.startsAt).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return `- ${when}: ${e.title}${e.location ? ` @ ${e.location}` : ""}`;
  });

  return [
    `Week of ${weekOf}.`,
    "",
    "Family chat posts:",
    postLines.length ? postLines.join("\n") : "(no posts this week)",
    "",
    "Calendar:",
    eventLines.length ? eventLines.join("\n") : "(no upcoming events)",
  ].join("\n");
}

/** Generate a weekly digest with Meta Muse (preferred) or Grok. Returns null if unconfigured or on failure. */
export async function aiDigestStory(input: {
  posts: Post[];
  members: Member[];
  events: CalendarEvent[];
  weekOf: string;
}): Promise<AiDigestDraft | null> {
  if (!aiConfigured()) return null;

  try {
    const { content, source } = await aiChat({
      json: true,
      temperature: 0.55,
      maxTokens: 800,
      reasoningEffort: "low",
      messages: [
        { role: "system", content: DIGEST_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildUserPayload(input.posts, input.members, input.events, input.weekOf),
        },
      ],
    });
    const parsed = parseModelJson<{
      title?: string;
      narrative?: string;
      highlights?: string[];
      theme?: string;
    }>(content);

    const title = parsed.title?.trim();
    const narrative = parsed.narrative?.trim();
    if (!title || !narrative) return null;

    return {
      title,
      narrative,
      highlights: Array.isArray(parsed.highlights)
        ? parsed.highlights.map((h) => String(h).trim()).filter(Boolean).slice(0, 8)
        : [],
      theme: parsed.theme?.trim() || "connection",
      source,
    };
  } catch (err) {
    console.error("AI digest failed; using local fallback.", err);
    return null;
  }
}

/** @deprecated Use `aiDigestStory` */
export const groqDigestStory = aiDigestStory;
