/** Passive activity signals for safe check-in - posts, reactions, voice, app use. */

import type { Post, PostReaction } from "./types";

export type ActivitySource = "post" | "reaction" | "voice" | "app";

type ActivityRecord = {
  familyId: string;
  memberId: string;
  at: string;
  source: ActivitySource;
};

const g = globalThis as typeof globalThis & { __hearthActivity?: ActivityRecord[] };

function records() {
  if (!g.__hearthActivity) g.__hearthActivity = [];
  return g.__hearthActivity;
}

export function recordActivity(
  familyId: string,
  memberId: string,
  source: ActivitySource,
  at = new Date().toISOString(),
) {
  const list = records();
  list.push({ familyId, memberId, at, source });
  return at;
}

/** Latest timestamp from posts, reactions, or explicit app interactions. */
export function lastMemberActivityAt(
  posts: Post[],
  reactions: PostReaction[],
  familyId: string,
  memberId: string,
): string | null {
  const stamps: string[] = [];

  for (const p of posts.filter((row) => row.authorId === memberId)) {
    stamps.push(p.createdAt);
  }

  for (const r of reactions.filter((row) => row.memberId === memberId && row.familyId === familyId)) {
    stamps.push(r.createdAt);
  }

  for (const a of records().filter((row) => row.familyId === familyId && row.memberId === memberId)) {
    stamps.push(a.at);
  }

  if (!stamps.length) return null;
  return stamps.sort((a, b) => b.localeCompare(a))[0];
}
