import type { Member, Post } from "./types";

export const QUIET_PORCH_DAYS = 5;

export function lastPostByMember(posts: Post[], memberId: string): Post | undefined {
  return posts
    .filter((p) => p.authorId === memberId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export function daysSince(iso: string, now: Date) {
  const then = new Date(iso).getTime();
  const ms = now.getTime() - then;
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export function formatLastHeard(iso: string, now: Date, timeZone?: string, hour12 = true) {
  const days = daysSince(iso, now);
  if (days <= 0) {
    const then = new Date(iso);
    const sameDay = then.toDateString() === now.toDateString();
    if (sameDay) {
      return `Today · ${then.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12,
        timeZone,
      })}`;
    }
    return "Yesterday";
  }
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone,
  });
}

export function isQuietPorch(memberId: string, posts: Post[], now: Date) {
  const last = lastPostByMember(posts, memberId);
  if (!last) return true;
  return daysSince(last.createdAt, now) >= QUIET_PORCH_DAYS;
}

export function memberCircleInfo(
  members: Member[],
  posts: Post[],
  now: Date,
  timeZone?: string,
  hour12 = true,
) {
  return members.map((member) => {
    const last = lastPostByMember(posts, member.id);
    return {
      member,
      lastPost: last,
      lastHeard: last ? formatLastHeard(last.createdAt, now, timeZone, hour12) : "Not yet",
      quiet: isQuietPorch(member.id, posts, now),
    };
  });
}

export function photoPosts(posts: Post[]) {
  return posts
    .filter((p) => p.kind === "photo" && p.photoUrl)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
