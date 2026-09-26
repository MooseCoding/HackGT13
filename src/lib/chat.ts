import type { Member, Post } from "./types";

export const GROUP_THREAD = "group";

/** Stable id for a 1:1 thread between two members. */
export function dmThreadId(a: string, b: string) {
  return `dm:${[a, b].sort().join(":")}`;
}

export function threadForDm(meId: string, otherId: string) {
  return dmThreadId(meId, otherId);
}

export function postThreadId(post: Post) {
  return post.threadId ?? GROUP_THREAD;
}

export function isGroupThread(threadId: string) {
  return threadId === GROUP_THREAD;
}

export function dmPartner(threadId: string, meId: string): string | null {
  if (isGroupThread(threadId)) return null;
  const parts = threadId.replace(/^dm:/, "").split(":");
  return parts.find((id) => id !== meId) ?? null;
}

export function threadLabel(
  threadId: string,
  meId: string,
  members: Member[],
  familyName: string,
) {
  if (isGroupThread(threadId)) return familyName;
  const partnerId = dmPartner(threadId, meId);
  const partner = members.find((m) => m.id === partnerId);
  return partner?.name ?? "Direct message";
}

export function lastPreview(post: Post) {
  if (post.kind === "photo") return post.body && post.body !== "Photo" ? `📷 ${post.body}` : "📷 Photo";
  if (post.kind === "voice") return "🎤 Voice message";
  if (post.kind === "status") return post.body;
  return post.transcript || post.body;
}

export function formatChatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date("2026-09-25T20:16:00-04:00");
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
}
