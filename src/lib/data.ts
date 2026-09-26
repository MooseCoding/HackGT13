import { formatAddress, type Address } from "./address";
import { getAuthUser, getProfile } from "./auth";
import { analyzeMember } from "./analysis";
import { postThreadId } from "./chat";
import { templateDigest } from "./digest";
import { DEFAULT_FAMILY_ID, initialsFrom, MEMBER_COLORS, slugId } from "./ids";
import { isDemoMode } from "./mode-server";
import {
  addEvent,
  addPost,
  db,
  deleteEvent as deleteEventDemo,
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
  return { id: row.id, name: row.name, tagline: row.tagline, inviteCode: row.join_code };
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
    street: row.street || undefined,
    apt: row.apt || undefined,
    city: row.city || undefined,
    state: row.state || undefined,
    postalCode: row.postal_code || undefined,
    country: row.country || undefined,
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
  const supabase = await createSupabaseServer();
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
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.from("members").select("*");
  throwIfError(error);
  return (data ?? []).map(mapMember);
}

export async function membersOf(familyId: string): Promise<Member[]> {
  if (await isDemoMode()) return membersOfDemo(familyId);
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.from("members").select("*").eq("family_id", familyId);
  throwIfError(error);
  return (data ?? []).map(mapMember);
}

export async function postsOf(familyId: string): Promise<Post[]> {
  if (await isDemoMode()) return postsOfDemo(familyId);
  const supabase = await createSupabaseServer();
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
  const supabase = await createSupabaseServer();
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
  const supabase = await createSupabaseServer();
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
  const supabase = await createSupabaseServer();
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

export async function deleteEventRow(id: string, familyId: string) {
  if (await isDemoMode()) {
    if (!deleteEventDemo(id, familyId)) throw new Error("Event not found.");
    return { ok: true };
  }
  const supabase = await createSupabaseServer();
  const { error, count } = await supabase
    .from("calendar_events")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("family_id", familyId);
  throwIfError(error);
  if (!count) throw new Error("Event not found.");
  return { ok: true };
}

export async function digestFor(familyId: string, refresh = false): Promise<Digest> {
  if (await isDemoMode()) return digestForDemo(familyId, refresh);
  const supabase = await createSupabaseServer();
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
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.from("posts").select("*").in("family_id", familyIds);
  throwIfError(error);
  const posts = (data ?? []).map(mapPost);
  return members.map((m) => analyzeMember(m.id, posts.filter((p) => p.familyId === m.familyId)));
}

export async function patientById(id: string) {
  if (await isDemoMode()) return patientByIdDemo(id);
  const supabase = await createSupabaseServer();
  const memberRes = await supabase.from("members").select("*").eq("id", id).maybeSingle();
  throwIfError(memberRes.error);
  if (!memberRes.data || !memberRes.data.clinical_opt_in) return null;
  const member = mapMember(memberRes.data);
  const family = await familyById(member.familyId);
  const [postRes, eventRes] = await Promise.all([
    supabase.from("posts").select("*").eq("family_id", member.familyId),
    supabase.from("calendar_events").select("*").eq("family_id", member.familyId).order("starts_at"),
  ]);
  throwIfError(postRes.error);
  throwIfError(eventRes.error);
  const familyPosts = (postRes.data ?? []).map(mapPost);
  const posts = familyPosts
    .filter((p) => p.authorId === id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    member,
    family,
    snapshot: analyzeMember(id, familyPosts),
    posts,
    events: (eventRes.data ?? []).map(mapEvent),
  };
}

export async function postingIdentity(requestedFamilyId: string, requestedMemberId: string) {
  if (await isDemoMode()) {
    const member = db().members.find(
      (candidate) => candidate.id === requestedMemberId && candidate.familyId === requestedFamilyId,
    );
    if (!member) throw new Error("That member does not belong to this family.");
    return { familyId: requestedFamilyId, memberId: requestedMemberId };
  }
  const profile = await getProfile();
  if (!profile?.family_id || !profile.member_id) throw new Error("Finish joining a family first.");
  if (profile.family_id !== requestedFamilyId || profile.member_id !== requestedMemberId) {
    throw new Error("You can only post as your own family profile.");
  }
  return { familyId: profile.family_id, memberId: profile.member_id };
}

export async function setClinicalConsent(requestedMemberId: string, enabled: boolean) {
  if (await isDemoMode()) {
    const member = db().members.find((candidate) => candidate.id === requestedMemberId);
    if (!member) throw new Error("Member not found.");
    member.clinicalOptIn = enabled;
    return member;
  }
  const profile = await getProfile();
  if (!profile?.member_id || profile.member_id !== requestedMemberId) {
    throw new Error("You can only change your own sharing preference.");
  }
  const supabase = await createSupabaseServer();
  const result = await supabase
    .from("members")
    .update({ clinical_opt_in: enabled })
    .eq("id", profile.member_id)
    .eq("family_id", profile.family_id ?? "")
    .select("*")
    .single();
  return mapMember(requireData(result.data, result.error));
}

export async function joinFamily(input: { inviteCode: string; memberName: string }) {
  const user = await getAuthUser();
  if (!user) throw new Error("Sign in to join a family.");
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("join_family", {
    invite_code_input: input.inviteCode.trim().toUpperCase(),
    member_name_input: input.memberName.trim(),
  });
  throwIfError(error);
  if (!data) throw new Error("That invite code and member name did not match an available profile.");
  return { joined: true };
}

export async function resolveFamilyId(): Promise<string> {
  if (await isDemoMode()) return DEFAULT_FAMILY_ID;
  const profile = await getProfile();
  if (profile?.family_id) return profile.family_id;
  return DEFAULT_FAMILY_ID;
}

export type NewMemberInput = {
  name: string;
  role: string;
  age: number;
  location?: string;
  address?: Address;
  isYou?: boolean;
};

export async function createFamilyWithMembers(input: {
  familyName: string;
  tagline?: string;
  members: NewMemberInput[];
}) {
  const user = await getAuthUser();
  if (!user) throw new Error("Sign in to create a family.");
  const supabase = await createSupabaseServer();
  const familyId = slugId("fam");
  const joinCode = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();

  const rows = input.members.map((m, i) => {
    const name = m.name.trim();
    const address = m.address;
    const location = address ? formatAddress(address) : m.location?.trim() || "Home";
    return {
      id: slugId("m"),
      family_id: familyId,
      name,
      role: m.role.trim() || "Family",
      age: Number.isFinite(m.age) ? m.age : 0,
      initials: initialsFrom(name),
      color: MEMBER_COLORS[i % MEMBER_COLORS.length],
      location,
      street: address?.street?.trim() || "",
      apt: address?.apt?.trim() || "",
      city: address?.city?.trim() || "",
      state: address?.state?.trim() || "",
      postal_code: address?.postalCode?.trim() || "",
      country: address?.country?.trim() || "United States",
      clinical_opt_in: false,
      easy_mode_default: Boolean(m.isYou),
    };
  });

  const youIndex = input.members.findIndex((m) => m.isYou);
  const you = rows[youIndex >= 0 ? youIndex : 0];
  const created = await supabase.rpc("create_family_circle", {
    family_id_input: familyId,
    family_name_input: input.familyName.trim(),
    tagline_input: input.tagline?.trim() || "Our family circle",
    join_code_input: joinCode,
    members_input: rows,
    you_member_id_input: you.id,
  });
  throwIfError(created.error);

  const [familyResult, memberResult] = await Promise.all([
    supabase.from("families").select("*").eq("id", familyId).single(),
    supabase.from("members").select("*").eq("family_id", familyId),
  ]);
  const family = requireData(familyResult.data, familyResult.error);
  throwIfError(memberResult.error);
  return { family: mapFamily(family), members: (memberResult.data ?? []).map(mapMember) };
}
