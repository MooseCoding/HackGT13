import { acceptInvitation, getInvitationPreview } from "@/lib/invitations";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  try {
    const invitation = await getInvitationPreview(token);
    if (!invitation) return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    return NextResponse.json({ invitation });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load invitation.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  try {
    const result = await acceptInvitation(token);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not accept invitation.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
