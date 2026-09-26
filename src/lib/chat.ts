import { DEMO_NOW, DEMO_TIMEZONE, dateKey, formatDateAtTime, formatTimeOnly } from "./clock";
import type { Member, Post } from "./types";

export const GROUP_THREAD = "group";
export const ASSISTANT_THREAD = "assistant";
/** Consented clinical intake — never shown in family chat threads. */
export const CLINICAL_INTAKE_THREAD = "clinical:intake";
export const FAMILY_GC_LABEL = "Family chat";
export const ASSISTANT_LABEL = "Hearth Assistant";

export function familyInitials(name: string) {
  const words = name.replace(/^the\s+/i, "").split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

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

export function isAssistantThread(threadId: string) {
  return threadId === ASSISTANT_THREAD;
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
  _familyName?: string,
) {
  if (isGroupThread(threadId)) return FAMILY_GC_LABEL;
  const partnerId = dmPartner(threadId, meId);
  const partner = members.find((m) => m.id === partnerId);
  return partner?.name ?? "Direct message";
}

export function lastPreview(post: Post) {
  if (post.kind === "photo") return post.body && post.body !== "Photo" ? `📷 ${post.body}` : "📷 Photo";
  if (post.kind === "voice") return "🎤 Voice message";
  if (post.kind === "status") return post.body;
  if (post.kind === "event_pin") return post.body || "📅 Event pinned";
  return post.transcript || post.body;
}

export function formatChatTime(iso: string, timeZone?: string, hour12 = true) {
  const tz = timeZone ?? DEMO_TIMEZONE;
  const sameDay = dateKey(iso, tz) === dateKey(DEMO_NOW.toISOString(), tz);
  if (sameDay) return formatTimeOnly(iso, { timeZone: tz, hour12 });
  return formatDateAtTime(new Date(iso), tz, "weekday-only", hour12);
}

export type ChatThread = {
  id: string;
  key: string;
  label: string;
  preview: string;
  time: string;
  sortAt: string;
  avatar?: Member;
  isGroup?: boolean;
};

/** Sidebar threads: family chat plus DMs that already have messages (and the open DM if new). */
export function buildChatThreads(
  posts: Post[],
  members: Member[],
  meId: string,
  familyName: string,
  timeZone?: string,
  activeThreadId?: string,
): ChatThread[] {
  const byId = Object.fromEntries(members.map((m) => [m.id, m]));
  const grouped = new Map<string, Post[]>();

  for (const post of posts) {
    const tid = postThreadId(post);
    const bucket = grouped.get(tid) ?? [];
    bucket.push(post);
    grouped.set(tid, bucket);
  }

  const list: ChatThread[] = [];
  const groupPosts = grouped.get(GROUP_THREAD) ?? [];
  const lastGroup = [...groupPosts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  list.push({
    id: GROUP_THREAD,
    key: GROUP_THREAD,
    label: FAMILY_GC_LABEL,
    preview: lastGroup ? lastPreview(lastGroup) : "Say hello to the circle",
    time: lastGroup ? formatChatTime(lastGroup.createdAt, timeZone) : "",
    sortAt: lastGroup?.createdAt ?? "",
    isGroup: true,
  });

  for (const [tid, threadPosts] of grouped) {
    if (isGroupThread(tid)) continue;
    const participants = tid.replace(/^dm:/, "").split(":");
    if (!participants.includes(meId)) continue;
    const partnerId = participants.find((id) => id !== meId);
    const partner = partnerId ? byId[partnerId] : undefined;
    if (!partner) continue;

    const last = [...threadPosts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    list.push({
      id: tid,
      key: partnerId!,
      label: partner.name,
      preview: lastPreview(last),
      time: formatChatTime(last.createdAt, timeZone),
      sortAt: last.createdAt,
      avatar: partner,
    });
  }

  if (activeThreadId && !isGroupThread(activeThreadId) && !list.some((t) => t.id === activeThreadId)) {
    const partnerId = dmPartner(activeThreadId, meId);
    const partner = partnerId ? byId[partnerId] : undefined;
    if (partner) {
      list.push({
        id: activeThreadId,
        key: partnerId!,
        label: partner.name,
        preview: "New conversation",
        time: "",
        sortAt: "",
        avatar: partner,
      });
    }
  }

  list.sort((a, b) => {
    if (a.id === GROUP_THREAD) return -1;
    if (b.id === GROUP_THREAD) return 1;
    return b.sortAt.localeCompare(a.sortAt);
  });

  return list;
}
