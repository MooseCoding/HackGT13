import { analyzeMember } from "./analysis";
import { postThreadId } from "./chat";
import { templateDigest } from "./digest";
import { isDemoMode } from "./mode-server";
import {
  addEvent,
  addPost,
  db,
  digestFor as digestForDemo,
  eventsOf as eventsOfDemo,
  familyById as familyByIdDemo,
  membersOf as membersOfDemo,
  optedInPatients as optedInPatientsDemo,
  patientById as patientByIdDemo,
  postsForThread as postsForThreadDemo,
  postsOf as postsOfDemo,
} from "./store";
import { createSupabaseServer } from "./supabase/server";
import type { Database } from "./supabase/types";
import type { CalendarEvent, Digest, Family, Member, PatientSnapshot, Post, PostKind } from "./types";

type MemberRow = Database["public"]["Tables"]["members"]["Row"];
type PostRow = Database["public"]["Tables"]["posts"]["Row"];
type EventRow = Database["public"]["Tables"]["calendar_events"]["Row"];
type DigestRow = Database["public"]["Tables"]["digests"]["Row"];
type FamilyRow = Database["public"]["Tables"]["families"]["Row"];

function iso(value: string) {
  return new Date(value).toISOString();
}

function mapFamily(row: FamilyRow): Family {
  return { id: row.id, name: row.name, tagline: row.tagline };
}

function mapMember(row: MemberRow): Member {
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    role: row.role,
    age: row.age,
    initials: row.initials,
    color: row.color,
    location: row.location,
    clinicalOptIn: row.clinical_opt_in,
    easyModeDefault: row.easy_mode_default,
  };
}

function mapPost(row: PostRow): Post {
  return {
    id: row.id,
    familyId: row.family_id,
    authorId: row.author_id,
    kind: row.kind as PostKind,
    body: row.body,
    createdAt: iso(row.created_at),
    threadId: row.thread_id ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    photoAlt: row.photo_alt ?? undefined,
    voiceSeconds: row.voice_seconds ?? undefined,
    transcript: row.transcript ?? undefined,
  };
}

function mapEvent(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    familyId: row.family_id,
    title: row.title,
    startsAt: iso(row.starts_at),
    endsAt: row.ends_at ? iso(row.ends_at) : undefined,
    location: row.location ?? undefined,
    attendees: row.attendees ?? [],
    sourceText: row.source_text,
    createdBy: row.created_by,
  };
}

function mapDigest(row: DigestRow): Digest {
  return {
    id: row.id,
    familyId: row.family_id,
    weekOf: row.week_of,
    title: row.title,
    narrative: row.narrative,
    highlights: row.highlights ?? [],
    generatedAt: iso(row.generated_at),
  };
}

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

function requireData<T>(data: T | null, error: { message: string } | null): T {
  throwIfError(error);
  if (data == null) throw new Error("Supabase returned no row");
  return data;
}

export async function familyById(id: string): Promise<Family> {
  if (await isDemoMode()) return familyByIdDemo(id);
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.from("families").select("*").eq("id", id).maybeSingle();
  throwIfError(error);
  if (data) return mapFamily(data);
  const fallback = await supabase.from("families").select("*").limit(1).maybeSingle();
  throwIfError(fallback.error);
  if (!fallback.data) throw new Error("No families in Supabase");
  return mapFamily(fallback.data);
}

export async function allMembers(): Promise<Member[]> {
  if (await isDemoMode()) return db().members;
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.from("members").select("*");
  throwIfError(error);
  return (data ?? []).map(mapMember);
}

export async function membersOf(familyId: string): Promise<Member[]> {
  if (await isDemoMode()) return membersOfDemo(familyId);
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.from("members").select("*").eq("family_id", familyId);
  throwIfError(error);
  return (data ?? []).map(mapMember);
}

export async function postsOf(familyId: string): Promise<Post[]> {
  if (await isDemoMode()) return postsOfDemo(familyId);
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });
  throwIfError(error);
  return (data ?? []).map(mapPost);
}

export async function postsForThread(familyId: string, threadId: string): Promise<Post[]> {
  if (await isDemoMode()) return postsForThreadDemo(familyId, threadId);
  const posts = await postsOf(familyId);
  return posts
    .filter((p) => postThreadId(p) === threadId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function eventsOf(familyId: string): Promise<CalendarEvent[]> {
  if (await isDemoMode()) return eventsOfDemo(familyId);
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("family_id", familyId)
    .order("starts_at", { ascending: true });
  throwIfError(error);
  return (data ?? []).map(mapEvent);
}

export async function addPostRow(post: Post): Promise<Post> {
  if (await isDemoMode()) return addPost(post);
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from("posts")
    .insert({
      id: post.id,
      family_id: post.familyId,
      author_id: post.authorId,
      kind: post.kind,
      body: post.body,
      created_at: post.createdAt,
      thread_id: post.threadId ?? null,
      photo_url: post.photoUrl ?? null,
      photo_alt: post.photoAlt ?? null,
      voice_seconds: post.voiceSeconds ?? null,
      transcript: post.transcript ?? null,
    })
    .select("*")
    .single();
  return mapPost(requireData(data, error));
}

export async function addEventRow(event: CalendarEvent): Promise<CalendarEvent> {
  if (await isDemoMode()) return addEvent(event);
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      id: event.id,
      family_id: event.familyId,
      title: event.title,
      starts_at: event.startsAt,
      ends_at: event.endsAt ?? null,
      location: event.location ?? null,
      attendees: event.attendees,
      source_text: event.sourceText,
      created_by: event.createdBy,
    })
    .select("*")
    .single();
  return mapEvent(requireData(data, error));
}

export async function digestFor(familyId: string, refresh = false): Promise<Digest> {
  if (await isDemoMode()) return digestForDemo(familyId, refresh);
  const supabase = createSupabaseServer();
  if (!refresh) {
    const existing = await supabase.from("digests").select("*").eq("family_id", familyId).maybeSingle();
    throwIfError(existing.error);
    if (existing.data) return mapDigest(existing.data);
  }
  const [members, posts, events] = await Promise.all([
    membersOf(familyId),
    postsOf(familyId),
    eventsOf(familyId),
  ]);
  const digest = templateDigest(familyId, members, posts, events);
  const { error } = await supabase.from("digests").delete().eq("family_id", familyId);
  throwIfError(error);
  const inserted = await supabase
    .from("digests")
    .insert({
      id: digest.id,
      family_id: digest.familyId,
      week_of: digest.weekOf,
      title: digest.title,
      narrative: digest.narrative,
      highlights: digest.highlights,
      generated_at: digest.generatedAt,
    })
    .select("*")
    .single();
  return mapDigest(requireData(inserted.data, inserted.error));
}

export async function optedInPatients(): Promise<PatientSnapshot[]> {
  if (await isDemoMode()) return optedInPatientsDemo();
  const members = (await allMembers()).filter((m) => m.clinicalOptIn);
  const familyIds = [...new Set(members.map((m) => m.familyId))];
  if (familyIds.length === 0) return [];
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.from("posts").select("*").in("family_id", familyIds);
  throwIfError(error);
  const posts = (data ?? []).map(mapPost);
  return members.map((m) => analyzeMember(m.id, posts.filter((p) => p.familyId === m.familyId)));
}

export async function patientById(id: string) {
  if (await isDemoMode()) return patientByIdDemo(id);
  const supabase = createSupabaseServer();
  const memberRes = await supabase.from("members").select("*").eq("id", id).maybeSingle();
  throwIfError(memberRes.error);
  if (!memberRes.data || !memberRes.data.clinical_opt_in) return null;
  const member = mapMember(memberRes.data);
  const family = await familyById(member.familyId);
  const { data, error } = await supabase.from("posts").select("*").eq("family_id", member.familyId);
  throwIfError(error);
  const familyPosts = (data ?? []).map(mapPost);
  const posts = familyPosts
    .filter((p) => p.authorId === id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    member,
    family,
    snapshot: analyzeMember(id, familyPosts),
    posts,
  };
}
