import { cookies } from "next/headers";
import { formatAddress, type Address } from "./address";
import { getAuthUser, getProfile } from "./auth";
import { analyzeMember } from "./analysis";
import { mergedEventsOf } from "./calendar-data";
import { calendarAnchor, now } from "./clock";
import { postThreadId } from "./chat";
import { buildDigest } from "./digest";
import { hestiaPreferLocal } from "./settings-server";
import { remindersFromCalendar } from "./remind-from-calendar";
import { DEFAULT_FAMILY_ID, initialsFrom, MEMBER_COLORS, slugId } from "./ids";
import { FAMILY_COOKIE } from "./mode";
import { isDemoMode } from "./mode-server";
import { families as seedFamilies } from "./seed";
import {
  addEvent,
  addPost,
  addReminder,
  db,
  deleteEvent,
  patchEvent,
  patchReminder,
  remindersOf as remindersOfDemo,
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
import type { Database, Json } from "./supabase/types";
import type { AudioMetrics, CalendarEvent, Digest, EventSupplyItem, Family, IntakeChannel, Member, MemberId, MemberInsurance, PatientSnapshot, Post, PostKind, Reminder, RsvpStatus } from "./types";

type MemberRow = Database["public"]["Tables"]["members"]["Row"];
type PostRow = Database["public"]["Tables"]["posts"]["Row"];
type EventRow = Database["public"]["Tables"]["calendar_events"]["Row"];
type DigestRow = Database["public"]["Tables"]["digests"]["Row"];
type FamilyRow = Database["public"]["Tables"]["families"]["Row"];

function iso(value: string) {
  return new Date(value).toISOString();
}

function mapFamily(row: FamilyRow): Family {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    inviteCode: row.join_code,
    autoAddFamilyCalls: row.auto_add_family_calls ?? true,
  };
}

function mapMember(row: MemberRow): Member {
  return applyInsuranceOverlay({
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
    insurance: parseMemberInsurance(row),
  });
}

function parseMemberInsurance(row: MemberRow): MemberInsurance | undefined {
  const raw = (row as MemberRow & { insurance?: unknown }).insurance;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const carrierId = (raw as { carrierId?: unknown }).carrierId;
  if (typeof carrierId !== "string" || !carrierId) return undefined;
  const policyMemberId = (raw as { policyMemberId?: unknown }).policyMemberId;
  const groupId = (raw as { groupId?: unknown }).groupId;
  return {
    carrierId,
    policyMemberId: typeof policyMemberId === "string" ? policyMemberId : undefined,
    groupId: typeof groupId === "string" ? groupId : undefined,
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
    channel: (row.source_channel as IntakeChannel) || "hearth",
    externalMessageId: row.external_message_id ?? undefined,
    audioMetrics: (row.audio_metrics as AudioMetrics | null) ?? undefined,
    rawRetained: row.raw_retained,
    linkedEventId: row.linked_event_id ?? undefined,
  };
}

function parseAttending(value: EventRow["attending"]): Partial<Record<MemberId, RsvpStatus>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const attending: Partial<Record<MemberId, RsvpStatus>> = {};
  for (const [memberId, status] of Object.entries(value)) {
    if (status === "yes" || status === "maybe" || status === "no") {
      attending[memberId] = status;
    }
  }
  return attending;
}

function parseSupplies(value: Json | null | undefined): EventSupplyItem[] {
  if (!Array.isArray(value)) return [];
  const out: EventSupplyItem[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const id = typeof row.id === "string" ? row.id : null;
    const item = typeof row.item === "string" ? row.item : null;
    if (!id || !item) continue;
    out.push({
      id,
      item,
      claimedBy: typeof row.claimedBy === "string" ? row.claimedBy : undefined,
    });
  }
  return out;
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
    attending: parseAttending(row.attending),
    supplies: parseSupplies((row as EventRow & { supplies?: Json }).supplies),
    calendarScope: row.id.startsWith("evt-m-") ? "mine" : row.id.startsWith("evt-f-") ? "family" : undefined,
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

export async function remindersOf(familyId: string): Promise<Reminder[]> {
  if (await isDemoMode()) return remindersOfDemo(familyId);
  return remindersOfDemo(familyId);
}

export async function addReminderRow(reminder: Reminder): Promise<Reminder> {
  if (await isDemoMode()) return addReminder(reminder);
  return addReminder(reminder);
}

export async function patchReminderRow(
  id: string,
  familyId: string,
  patch: Partial<Reminder>,
): Promise<Reminder | null> {
  if (await isDemoMode()) return patchReminder(id, familyId, patch);
  return patchReminder(id, familyId, patch);
}

/** Auto-create open reminders from upcoming calendar events (local rules only). */
export async function syncRemindersFromCalendar(
  familyId: string,
  opts?: { anchor?: Date; clientToken?: string | null },
): Promise<Reminder[]> {
  const demo = await isDemoMode();
  const anchor = opts?.anchor ?? calendarAnchor(demo);
  const [events, members, existing] = await Promise.all([
    mergedEventsOf(familyId, { anchor, clientToken: opts?.clientToken, googlePull: "window" }),
    membersOf(familyId),
    remindersOf(familyId),
  ]);

  const drafts = remindersFromCalendar(events, members, existing, anchor);
  for (const draft of drafts) {
    await addReminderRow({
      id: `rem-cal-${draft.sourceEventId}-${draft.assigneeId}`,
      familyId,
      assigneeId: draft.assigneeId,
      text: draft.text,
      dueAt: draft.dueAt,
      dueHint: draft.dueHint,
      sourceText: draft.sourceText,
      sourceEventId: draft.sourceEventId,
      createdBy: draft.createdBy,
      createdAt: demo ? now() : new Date().toISOString(),
      status: "open",
    });
  }

  return remindersOf(familyId);
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
      source_channel: post.channel ?? "hearth",
      external_message_id: post.externalMessageId ?? null,
      audio_metrics: post.audioMetrics ?? null,
      raw_retained: post.rawRetained ?? true,
      linked_event_id: post.linkedEventId ?? null,
    })
    .select("*")
    .single();
  return mapPost(requireData(data, error));
}

export async function deleteEventRow(id: string, familyId: string) {
  if (await isDemoMode()) {
    if (!deleteEvent(id, familyId)) throw new Error("Event not found");
    return;
  }
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id)
    .eq("family_id", familyId)
    .select("id");
  throwIfError(error);
  if (!data?.length) throw new Error("Could not delete event.");
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
      attending: event.attending ?? {},
      supplies: event.supplies ?? [],
    })
    .select("*")
    .single();
  const saved = mapEvent(requireData(data, error));
  if (event.googleEventId) {
    return { ...saved, googleEventId: event.googleEventId, isGoogleSynced: event.isGoogleSynced };
  }
  return saved;
}

export async function patchEventRow(
  id: string,
  familyId: string,
  patch: Partial<CalendarEvent>,
): Promise<CalendarEvent | null> {
  if (await isDemoMode()) return patchEvent(id, familyId, patch);

  if (patch.attending !== undefined) {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase
      .from("calendar_events")
      .update({ attending: patch.attending })
      .eq("id", id)
      .eq("family_id", familyId)
      .select("*")
      .maybeSingle();
    throwIfError(error);
    if (!data) return null;
    const { attending: _attending, ...rest } = patch;
    return { ...mapEvent(data), ...rest };
  }

  if (patch.supplies !== undefined) {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase
      .from("calendar_events")
      .update({ supplies: patch.supplies as Json })
      .eq("id", id)
      .eq("family_id", familyId)
      .select("*")
      .maybeSingle();
    throwIfError(error);
    if (!data) return null;
    const { supplies: _supplies, ...rest } = patch;
    return { ...mapEvent(data), ...rest };
  }

  // Google metadata is kept in-memory for the session; DB schema has no google columns yet.
  return null;
}

export async function digestFor(familyId: string, refresh = false): Promise<Digest> {
  const preferLocal = await hestiaPreferLocal();
  if (await isDemoMode()) return await digestForDemo(familyId, refresh, preferLocal);
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
  const digest = await buildDigest(familyId, members, posts, events, { demo: false, preferLocal });
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
  const referenceDate = new Date();
  return members.map((m) => analyzeMember(m.id, posts.filter((p) => p.familyId === m.familyId), referenceDate));
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
    snapshot: analyzeMember(id, familyPosts, new Date()),
    posts,
    events: (eventRes.data ?? []).map(mapEvent),
  };
}

export async function hasFamilyAccess(familyId: string): Promise<boolean> {
  if (await isDemoMode()) {
    return seedFamilies.some((f) => f.id === familyId);
  }
  const user = await getAuthUser();
  if (!user) return false;
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("has_family_access", { fid: familyId });
  throwIfError(error);
  return Boolean(data);
}

export async function requireFamilyAccess(familyId: string) {
  if (!(await hasFamilyAccess(familyId))) {
    throw new Error("You do not have access to this family.");
  }
}

export async function postingIdentity(requestedFamilyId: string, requestedMemberId: string) {
  if (await isDemoMode()) {
    const member = db().members.find(
      (candidate) => candidate.id === requestedMemberId && candidate.familyId === requestedFamilyId,
    );
    if (!member) throw new Error("That member does not belong to this family.");
    return { familyId: requestedFamilyId, memberId: requestedMemberId };
  }
  const user = await getAuthUser();
  if (!user) throw new Error("Sign in to post.");
  await requireFamilyAccess(requestedFamilyId);
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("members")
    .select("id, family_id")
    .eq("family_id", requestedFamilyId)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  throwIfError(error);
  if (!data) throw new Error("You can only post as your own member profile in this family.");
  // The authenticated membership is authoritative. A stale client-side member
  // selection must not make a valid signed-in user's message disappear.
  return { familyId: data.family_id, memberId: data.id };
}

export async function setClinicalConsent(requestedMemberId: string, enabled: boolean) {
  if (await isDemoMode()) {
    const member = db().members.find((candidate) => candidate.id === requestedMemberId);
    if (!member) throw new Error("Member not found.");
    member.clinicalOptIn = enabled;
    return member;
  }
  const user = await getAuthUser();
  if (!user) throw new Error("Sign in to update sharing.");
  const familyId = await resolveFamilyId();
  const supabase = await createSupabaseServer();
  const result = await supabase
    .from("members")
    .update({ clinical_opt_in: enabled })
    .eq("id", requestedMemberId)
    .eq("family_id", familyId)
    .eq("user_id", user.id)
    .select("*")
    .single();
  const member = mapMember(requireData(result.data, result.error));

  const { syncHealthcareConsentMetadata } = await import("./consent-server");
  await syncHealthcareConsentMetadata(enabled);

  return member;
}

const insuranceOverlayGlobal = globalThis as typeof globalThis & {
  __hearthInsuranceOverlay?: Record<string, MemberInsurance | undefined>;
};

function setInsuranceOverlay(memberId: string, insurance: MemberInsurance | undefined) {
  if (!insuranceOverlayGlobal.__hearthInsuranceOverlay) {
    insuranceOverlayGlobal.__hearthInsuranceOverlay = {};
  }
  insuranceOverlayGlobal.__hearthInsuranceOverlay[memberId] = insurance;
}

function applyInsuranceOverlay(member: Member): Member {
  const overlay = insuranceOverlayGlobal.__hearthInsuranceOverlay?.[member.id];
  if (overlay === undefined) return member;
  return { ...member, insurance: overlay };
}

export async function setMemberInsurance(requestedMemberId: string, insurance: MemberInsurance | null) {
  const nextInsurance = insurance ?? undefined;
  if (await isDemoMode()) {
    const member = db().members.find((candidate) => candidate.id === requestedMemberId);
    if (!member) throw new Error("Member not found.");
    member.insurance = nextInsurance;
    return member;
  }

  const user = await getAuthUser();
  if (!user) throw new Error("Sign in to update insurance.");
  const familyId = await resolveFamilyId();
  const members = await membersOf(familyId);
  const member = members.find((candidate) => candidate.id === requestedMemberId);
  if (!member) throw new Error("Member not found.");
  setInsuranceOverlay(requestedMemberId, nextInsurance);
  return { ...member, insurance: nextInsurance };
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
  const { applyHealthcareConsentToMember, profileHealthcareConsentEnabled } = await import("./consent-server");
  if (await profileHealthcareConsentEnabled()) {
    await applyHealthcareConsentToMember(true);
  }
  return { joined: true };
}

export async function resolveFamilyId(): Promise<string> {
  if (await isDemoMode()) {
    const jar = await cookies();
    const cookieVal = jar.get(FAMILY_COOKIE)?.value;
    if (cookieVal && seedFamilies.some((f) => f.id === cookieVal)) return cookieVal;
    return DEFAULT_FAMILY_ID;
  }
  const user = await getAuthUser();
  if (!user) return DEFAULT_FAMILY_ID;
  const profile = await getProfile();
  if (profile?.family_id && (await hasFamilyAccess(profile.family_id))) {
    return profile.family_id;
  }
  const supabase = await createSupabaseServer();
  const memberRes = await supabase
    .from("members")
    .select("family_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  throwIfError(memberRes.error);
  if (memberRes.data?.family_id) return memberRes.data.family_id;
  const ownedRes = await supabase.from("families").select("id").eq("owner_id", user.id).limit(1).maybeSingle();
  throwIfError(ownedRes.error);
  if (ownedRes.data?.id) return ownedRes.data.id;
  return DEFAULT_FAMILY_ID;
}

export async function familiesForUser(): Promise<{ families: Family[]; activeId: string }> {
  const activeId = await resolveFamilyId();
  if (await isDemoMode()) {
    return { families: seedFamilies, activeId };
  }
  const user = await getAuthUser();
  if (!user) return { families: [], activeId };
  const supabase = await createSupabaseServer();
  const [ownedRes, memberRes] = await Promise.all([
    supabase.from("families").select("*").eq("owner_id", user.id),
    supabase.from("members").select("family_id").eq("user_id", user.id),
  ]);
  throwIfError(ownedRes.error);
  throwIfError(memberRes.error);
  const familyIds = [
    ...new Set([
      ...(ownedRes.data ?? []).map((f) => f.id),
      ...(memberRes.data ?? []).map((m) => m.family_id),
    ]),
  ];
  if (familyIds.length === 0) return { families: [], activeId };
  const familiesRes = await supabase.from("families").select("*").in("id", familyIds);
  throwIfError(familiesRes.error);
  const families = (familiesRes.data ?? []).map(mapFamily);
  families.sort((a, b) => a.name.localeCompare(b.name));
  return { families, activeId };
}

export async function setActiveFamily(familyId: string) {
  if (await isDemoMode()) {
    if (!seedFamilies.some((f) => f.id === familyId)) {
      throw new Error("That family is not available in demo mode.");
    }
    return { activeId: familyId };
  }
  await requireFamilyAccess(familyId);
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("set_active_family", { family_id_input: familyId });
  throwIfError(error);
  if (!data) throw new Error("Could not switch to that family.");
  return { activeId: familyId };
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
  const { profileHealthcareConsentEnabled } = await import("./consent-server");
  const healthcareOptIn = await profileHealthcareConsentEnabled();
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
      clinical_opt_in: Boolean(m.isYou && healthcareOptIn),
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
  const mappedFamily = mapFamily(family);
  const mappedMembers = (memberResult.data ?? []).map(mapMember);

  if (mappedFamily.autoAddFamilyCalls) {
    try {
      const { scheduleFamilyCallsForCircle } = await import("./auto-family-calls");
      await scheduleFamilyCallsForCircle(mappedFamily.id, you.id);
    } catch (err) {
      console.error("Auto family calls on circle creation:", err);
    }
  }

  return { family: mappedFamily, members: mappedMembers };
}

export async function updateFamilyAutoAddFamilyCalls(familyId: string, enabled: boolean) {
  if (await isDemoMode()) {
    throw new Error("Sign in to update circle settings.");
  }
  await requireFamilyAccess(familyId);
  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from("families")
    .update({ auto_add_family_calls: enabled })
    .eq("id", familyId);
  throwIfError(error);
  return { autoAddFamilyCalls: enabled };
}
