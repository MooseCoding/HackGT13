export type FamilyInvitation = {
  id: string;
  familyId: string;
  memberId: string;
  token: string;
  email: string;
  inviteeName: string;
  role: string;
  invitedBy?: string | null;
  status: "pending" | "accepted" | "revoked";
  createdAt: string;
  acceptedAt?: string | null;
  inviteUrl?: string;
};

export type InvitationPreview = {
  id: string;
  familyId: string;
  familyName: string;
  inviteeName: string;
  role: string;
  email: string;
  status: string;
};
