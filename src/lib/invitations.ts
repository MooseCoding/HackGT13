import { getAuthUser } from "./auth";
import { requireFamilyAccess } from "./data";
import { initialsFrom, MEMBER_COLORS, slugId } from "./ids";
import type { FamilyInvitation, InvitationPreview } from "./invitations-types";
import { isDemoMode } from "./mode-server";
import { db } from "./store";
import { createSupabaseServer } from "./supabase/server";
import type { Database } from "./supabase/types";
import type { Member } from "./types";

type InviteRow = Database["public"]["Tables"]["family_invitations"]["Row"];

type DemoInvite = FamilyInvitation;

const g = globalThis as typeof globalThis & { __hearthInvites?: DemoInvite[] };

function demoInvites() {
  if (!g.__hearthInvites) g.__hearthInvites = [];
  return g.__hearthInvites;
}

function mapInvite(row: InviteRow, origin?: string): FamilyInvitation {
  return {
    id: row.id,
    familyId: row.family_id,
    memberId: row.member_id,
    token: row.token,
    email: row.email,
    inviteeName: row.invitee_name,
    role: row.role,
    invitedBy: row.invited_by,
    status: row.status as FamilyInvitation["status"],
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
    inviteUrl: origin ? `${origin}/invite/${row.token}` : undefined,
  };
}

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function listFamilyInvitations(familyId: string, origin?: string): Promise<FamilyInvitation[]> {
  if (await isDemoMode()) {
    return demoInvites()
      .filter((i) => i.familyId === familyId)
      .map((i) => ({ ...i, inviteUrl: origin ? `${origin}/invite/${i.token}` : i.inviteUrl }));
  }
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("family_invitations")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });
  throwIfError(error);
  return (data ?? []).map((row) => mapInvite(row, origin));
}

export async function createFamilyInvitation(input: {
  familyId: string;
  name: string;
  email: string;
  role?: string;
  origin: string;
}): Promise<FamilyInvitation> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const role = input.role?.trim() || "Family";
  if (!name) throw new Error("Enter their name.");
  if (!email.includes("@")) throw new Error("Enter a valid email.");

  if (await isDemoMode()) {
    const memberId = slugId("m");
    const color = MEMBER_COLORS[db().members.length % MEMBER_COLORS.length];
    const member: Member = {
      id: memberId,
      familyId: input.familyId,
      name,
      role,
      age: 0,
      initials: initialsFrom(name),
      color,
      location: "Invited",
      clinicalOptIn: false,
    };
    db().members.push(member);
    const invite: DemoInvite = {
      id: slugId("inv"),
      familyId: input.familyId,
      memberId,
      token: crypto.randomUUID().replaceAll("-", ""),
      email,
      inviteeName: name,
      role,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    demoInvites().unshift(invite);
    return { ...invite, inviteUrl: `${input.origin}/invite/${invite.token}` };
  }

  const user = await getAuthUser();
  if (!user) throw new Error("Sign in to invite someone.");
  await requireFamilyAccess(input.familyId);

  const supabase = await createSupabaseServer();
  const existing = await supabase
    .from("family_invitations")
    .select("id")
    .eq("family_id", input.familyId)
    .eq("status", "pending")
    .ilike("email", email)
    .maybeSingle();
  throwIfError(existing.error);
  if (existing.data) throw new Error("That email already has a pending invite.");

  const memberCount = await supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("family_id", input.familyId);
  throwIfError(memberCount.error);
  const color = MEMBER_COLORS[(memberCount.count ?? 0) % MEMBER_COLORS.length];
  const memberId = slugId("m");
  const memberInsert = await supabase
    .from("members")
    .insert({
      id: memberId,
      family_id: input.familyId,
      name,
      role,
      age: 0,
      initials: initialsFrom(name),
      color,
      location: "Invited",
      street: "",
      apt: "",
      city: "",
      state: "",
      postal_code: "",
      country: "United States",
      clinical_opt_in: false,
      easy_mode_default: false,
      user_id: null,
    })
    .select("*")
    .single();
  throwIfError(memberInsert.error);

  const token = crypto.randomUUID().replaceAll("-", "");
  const inviteInsert = await supabase
    .from("family_invitations")
    .insert({
      id: slugId("inv"),
      family_id: input.familyId,
      member_id: memberId,
      token,
      email,
      invitee_name: name,
      role,
      invited_by: user.id,
      status: "pending",
    })
    .select("*")
    .single();
  if (inviteInsert.error) {
    await supabase.from("members").delete().eq("id", memberId);
    throw new Error(inviteInsert.error.message);
  }
  return mapInvite(inviteInsert.data, input.origin);
}

export async function getInvitationPreview(token: string): Promise<InvitationPreview | null> {
  if (await isDemoMode()) {
    const invite = demoInvites().find((i) => i.token === token);
    if (!invite) return null;
    const family = db().families.find((f) => f.id === invite.familyId);
    return {
      id: invite.id,
      familyId: invite.familyId,
      familyName: family?.name ?? "Family",
      inviteeName: invite.inviteeName,
      role: invite.role,
      email: invite.email,
      status: invite.status,
    };
  }
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("get_invitation_by_token", { token_input: token });
  throwIfError(error);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    id: row.id,
    familyId: row.family_id,
    familyName: row.family_name,
    inviteeName: row.invitee_name,
    role: row.role,
    email: row.email,
    status: row.status,
  };
}

export async function acceptInvitation(token: string) {
  if (await isDemoMode()) {
    const invite = demoInvites().find((i) => i.token === token && i.status === "pending");
    if (!invite) throw new Error("Invitation not found or already used.");
    invite.status = "accepted";
    invite.acceptedAt = new Date().toISOString();
    const member = db().members.find((m) => m.id === invite.memberId);
    if (member) member.location = member.location === "Invited" ? "Joined" : member.location;
    return { joined: true, familyId: invite.familyId, memberId: invite.memberId };
  }
  const user = await getAuthUser();
  if (!user) throw new Error("Sign in to accept an invitation.");
  const preview = await getInvitationPreview(token);
  if (!preview || preview.status !== "pending") {
    throw new Error("Invitation not found or already used.");
  }
  const supabase = await createSupabaseServer();
  const { error } = await supabase.rpc("accept_family_invitation", { token_input: token });
  throwIfError(error);
  const { applyHealthcareConsentToMember, profileHealthcareConsentEnabled } = await import("./consent-server");
  if (await profileHealthcareConsentEnabled()) {
    await applyHealthcareConsentToMember(true);
  }
  return { joined: true, familyId: preview.familyId };
}
