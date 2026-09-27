import { analyzeMember } from "./analysis";
import { seedDemoPatientAssignments } from "./clinical/assignments";
import { atDay } from "./clock";
import { GROUP_THREAD, postThreadId, threadForDm } from "./chat";
import { aiConfigured, grokConfigured, museConfigured } from "./ai/config";
import { buildDigest } from "./digest";
import { enrichDigestTimeMachine } from "./digest-time-machine";
import { alvarezPersonalEvents } from "./demo-personal-calendars";
import { events as seedEvents, families, members, posts as seedPosts, reminders as seedReminders } from "./seed";
import type { CalendarEvent, Digest, Family, Member, PatientSnapshot, Post, Reminder } from "./types";

/** In-memory mock backend used when demo mode is on. */

type Store = {
  families: Family[];
  members: Member[];
  posts: Post[];
  events: CalendarEvent[];
  reminders: Reminder[];
  digests: Digest[];
};

const g = globalThis as typeof globalThis & { __hearth?: Store };

function empty(): Store {
  const store = {
    families: structuredClone(families),
    members: structuredClone(members),
    posts: structuredClone(seedPosts),
    events: structuredClone(seedEvents),
    reminders: structuredClone(seedReminders),
    digests: [],
  };
  seedDemoCheckInState();
  seedDemoPatientAssignments();
  return store;
}

function hydrateStore(store: Store): Store {
  if (!store.reminders) store.reminders = structuredClone(seedReminders);
  return store;
}

export function db(): Store {
  if (!g.__hearth) g.__hearth = empty();
  return hydrateStore(g.__hearth);
}

export function resetStore() {
  g.__hearth = empty();
  seedDemoCheckInState();
}

/** Pre-seed safe check-in alert stage for Alvarez demo (prompt sent morning of demo day). */
export function seedDemoCheckInState() {
  const gCheck = globalThis as typeof globalThis & {
    __hearthCheckIns?: Array<{ familyId: string; memberId: string; promptSentAt?: string }>;
  };
  gCheck.__hearthCheckIns = [
    {
      familyId: "alvarez",
      memberId: "elena",
      promptSentAt: atDay(0, 6, 0),
    },
  ];
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
  const store = db().events.filter((e) => e.familyId === familyId);
  if (familyId !== "alvarez") {
    return store.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  const personalIds = new Set(alvarezPersonalEvents.map((e) => e.id));
  const withoutStalePersonal = store.filter(
    (e) => e.calendarScope !== "mine" || personalIds.has(e.id),
  );
  const known = new Set(withoutStalePersonal.map((e) => e.id));
  const personal = alvarezPersonalEvents.filter((e) => !known.has(e.id));
  return [...withoutStalePersonal, ...personal].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function addPost(post: Post) {
  db().posts.push(post);
  return post;
}

export function addEvent(event: CalendarEvent) {
  db().events.push(event);
  return event;
}

export function patchEvent(id: string, familyId: string, patch: Partial<CalendarEvent>) {
  const store = db();
  const idx = store.events.findIndex((e) => e.id === id && e.familyId === familyId);
  if (idx < 0) return null;
  store.events[idx] = { ...store.events[idx], ...patch };
  return store.events[idx];
}

export function deleteEvent(id: string, familyId: string) {
  const store = db();
  const before = store.events.length;
  store.events = store.events.filter((e) => !(e.id === id && e.familyId === familyId));
  return store.events.length < before;
}

export function remindersOf(familyId: string) {
  return db()
    .reminders.filter((r) => r.familyId === familyId)
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "open" ? -1 : 1;
      const aDue = a.dueAt ?? a.createdAt;
      const bDue = b.dueAt ?? b.createdAt;
      return aDue.localeCompare(bDue);
    });
}

export function addReminder(reminder: Reminder) {
  const store = db();
  store.reminders.push(reminder);
  return reminder;
}

export function patchReminder(id: string, familyId: string, patch: Partial<Reminder>) {
  const store = db();
  const idx = store.reminders.findIndex((r) => r.id === id && r.familyId === familyId);
  if (idx < 0) return null;
  store.reminders[idx] = { ...store.reminders[idx], ...patch };
  return store.reminders[idx];
}

function digestMatchesPreference(digest: Digest, preferLocal: boolean) {
  const source = digest.source ?? "local";
  if (preferLocal) return source === "local";
  if (museConfigured()) return source === "muse";
  if (grokConfigured()) return source === "grok";
  if (aiConfigured()) return source !== "local";
  return source === "local";
}

export async function digestFor(familyId: string, refresh = false, preferLocal = false) {
  const store = db();
  const existing = store.digests.find((d) => d.familyId === familyId);
  const needsRebuild = refresh || !existing || !digestMatchesPreference(existing, preferLocal);

  if (existing && !needsRebuild) {
    const woven = existing.storybook?.some((p) => p.id === "memories-divider");
    if (existing.onThisDay?.length && woven) return existing;
    const enriched = enrichDigestTimeMachine(existing, membersOf(familyId), postsOf(familyId), true);
    store.digests = store.digests.filter((d) => d.familyId !== familyId);
    store.digests.push(enriched);
    return enriched;
  }
  const digest = await buildDigest(familyId, membersOf(familyId), postsOf(familyId), eventsOf(familyId), {
    demo: true,
    preferLocal,
  });
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
