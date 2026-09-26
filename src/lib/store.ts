import { analyzeMember } from "./analysis";
import { GROUP_THREAD, postThreadId, threadForDm } from "./chat";
import { templateDigest } from "./digest";
import { events as seedEvents, families, members, posts as seedPosts } from "./seed";
import type { CalendarEvent, Digest, Family, Member, PatientSnapshot, Post } from "./types";

/** In-memory mock backend used when demo mode is on. */

type Store = {
  families: Family[];
  members: Member[];
  posts: Post[];
  events: CalendarEvent[];
  digests: Digest[];
};

const g = globalThis as typeof globalThis & { __hearth?: Store };

function empty(): Store {
  return {
    families: structuredClone(families),
    members: structuredClone(members),
    posts: structuredClone(seedPosts),
    events: structuredClone(seedEvents),
    digests: [],
  };
}

export function db(): Store {
  if (!g.__hearth) g.__hearth = empty();
  return g.__hearth;
}

export function resetStore() {
  g.__hearth = empty();
}

export function familyById(id: string) {
  return db().families.find((f) => f.id === id) ?? db().families[0];
}

export function membersOf(familyId: string) {
  return db().members.filter((m) => m.familyId === familyId);
}

export function postsOf(familyId: string) {
  return db()
    .posts.filter((p) => p.familyId === familyId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function postsForThread(familyId: string, threadId: string) {
  return db()
    .posts.filter((p) => p.familyId === familyId && postThreadId(p) === threadId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function resolveThreadId(withParam: string, meId: string) {
  if (!withParam || withParam === GROUP_THREAD) return GROUP_THREAD;
  return threadForDm(meId, withParam);
}

export function eventsOf(familyId: string) {
  return db()
    .events.filter((e) => e.familyId === familyId)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function addPost(post: Post) {
  db().posts.push(post);
  return post;
}

export function addEvent(event: CalendarEvent) {
  db().events.push(event);
  return event;
}

export function deleteEvent(id: string, familyId: string) {
  const store = db();
  const before = store.events.length;
  store.events = store.events.filter((e) => !(e.id === id && e.familyId === familyId));
  return store.events.length < before;
}

export function digestFor(familyId: string, refresh = false) {
  const store = db();
  const existing = store.digests.find((d) => d.familyId === familyId);
  if (existing && !refresh) return existing;
  const digest = templateDigest(familyId, membersOf(familyId), postsOf(familyId), eventsOf(familyId));
  store.digests = store.digests.filter((d) => d.familyId !== familyId);
  store.digests.push(digest);
  return digest;
}

export function optedInPatients(): PatientSnapshot[] {
  return db()
    .members.filter((m) => m.clinicalOptIn)
    .map((m) => analyzeMember(m.id, db().posts.filter((p) => p.familyId === m.familyId)));
}

export function patientById(id: string) {
  const member = db().members.find((m) => m.id === id);
  if (!member || !member.clinicalOptIn) return null;
  return {
    member,
    family: familyById(member.familyId),
    snapshot: analyzeMember(id, db().posts.filter((p) => p.familyId === member.familyId)),
    posts: db()
      .posts.filter((p) => p.authorId === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    events: eventsOf(member.familyId),
  };
}
