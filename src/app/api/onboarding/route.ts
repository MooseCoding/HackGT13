import { createFamilyWithMembers, joinFamily, type NewMemberInput } from "@/lib/data";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    mode?: "create" | "join";
    inviteCode?: string;
    memberName?: string;
    familyName?: string;
    tagline?: string;
    members?: NewMemberInput[];
  };
  if (body.mode === "join") {
    if (!body.inviteCode?.trim() || !body.memberName?.trim()) {
      return NextResponse.json({ error: "Enter the invite code and your full member name." }, { status: 400 });
    }
    try {
      return NextResponse.json(await joinFamily({ inviteCode: body.inviteCode, memberName: body.memberName }));
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Could not join family." },
        { status: 400 },
      );
    }
  }
  const members = (body.members ?? []).filter((m) => m.name?.trim());
  if (!body.familyName?.trim()) {
    return NextResponse.json({ error: "Give your family a name." }, { status: 400 });
  }
  if (members.length < 1) {
    return NextResponse.json({ error: "Add at least one family member (you)." }, { status: 400 });
  }
  if (!members.some((m) => m.isYou)) members[0].isYou = true;
  try {
    const result = await createFamilyWithMembers({
      familyName: body.familyName,
      tagline: body.tagline,
      members,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save family.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
