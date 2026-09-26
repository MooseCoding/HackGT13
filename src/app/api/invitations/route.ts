import { createFamilyInvitation, listFamilyInvitations } from "@/lib/invitations";
import { resolveFamilyId } from "@/lib/data";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const familyId = req.nextUrl.searchParams.get("familyId") || (await resolveFamilyId());
    const origin = req.nextUrl.origin;
    const invitations = await listFamilyInvitations(familyId, origin);
    return NextResponse.json({ invitations });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load invitations.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      familyId?: string;
      name?: string;
      email?: string;
      role?: string;
    };
    const familyId = body.familyId || (await resolveFamilyId());
    const invite = await createFamilyInvitation({
      familyId,
      name: body.name || "",
      email: body.email || "",
      role: body.role,
      origin: req.nextUrl.origin,
    });
    return NextResponse.json({ invitation: invite });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not send invitation.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
