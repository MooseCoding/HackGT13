import { AcceptInvite } from "@/components/family/AcceptInvite";
import { getAuthUser } from "@/lib/auth";
import { getInvitationPreview } from "@/lib/invitations";
import { isDemoMode } from "@/lib/mode-server";
import { getPublicSupabaseConfig } from "@/lib/supabase/public";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await getInvitationPreview(token);
  if (!invitation) notFound();

  const [user, demo] = await Promise.all([getAuthUser(), isDemoMode()]);

  return (
    <AcceptInvite
      token={token}
      invitation={invitation}
      signedIn={Boolean(user)}
      demo={demo}
      supabaseConfig={getPublicSupabaseConfig()}
    />
  );
}
