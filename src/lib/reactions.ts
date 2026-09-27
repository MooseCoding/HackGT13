import type { PostReaction } from "./types";

const g = globalThis as typeof globalThis & { __hearthReactions?: PostReaction[] };

function records() {
  if (!g.__hearthReactions) g.__hearthReactions = [];
  return g.__hearthReactions;
}

export function reactionsOf(familyId: string) {
  return records().filter((r) => r.familyId === familyId);
}

export function reactionsForPost(familyId: string, postId: string) {
  return reactionsOf(familyId).filter((r) => r.postId === postId);
}

export function reactionsForMember(familyId: string, memberId: string) {
  return reactionsOf(familyId).filter((r) => r.memberId === memberId);
}

export function addReaction(input: {
  familyId: string;
  postId: string;
  memberId: string;
  emoji: string;
  at?: string;
}): PostReaction {
  const list = records();
  const existing = list.find(
    (r) =>
      r.familyId === input.familyId &&
      r.postId === input.postId &&
      r.memberId === input.memberId &&
      r.emoji === input.emoji,
  );
  if (existing) return existing;

  const row: PostReaction = {
    id: `rx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    familyId: input.familyId,
    postId: input.postId,
    memberId: input.memberId,
    emoji: input.emoji,
    createdAt: input.at ?? new Date().toISOString(),
  };
  list.push(row);
  return row;
}
