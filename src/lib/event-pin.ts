import { GROUP_THREAD } from "./chat";
import { now } from "./clock";
import { addPostRow, postsForThread } from "./data";
import { isDemoMode } from "./mode-server";
import type { CalendarEvent, Post } from "./types";

/** Human-readable body for an event pin post. */
export function eventPinBody(event: CalendarEvent) {
  return `📅 ${event.title}`;
}

/** Broadcast a pinned event card into the family group chat. Skips duplicates and personal events. */
export async function broadcastEventPin(
  event: CalendarEvent,
  authorId: string,
): Promise<Post | null> {
  if (event.calendarScope === "mine") return null;

  const threadId = GROUP_THREAD;
  const existing = await postsForThread(event.familyId, threadId);
  if (existing.some((p) => p.kind === "event_pin" && p.linkedEventId === event.id)) {
    return null;
  }

  const post: Post = {
    id: `pin-${event.id}`,
    familyId: event.familyId,
    authorId,
    kind: "event_pin",
    body: eventPinBody(event),
    linkedEventId: event.id,
    createdAt: (await isDemoMode()) ? now() : new Date().toISOString(),
    threadId,
    channel: "hearth",
  };

  return addPostRow(post);
}
