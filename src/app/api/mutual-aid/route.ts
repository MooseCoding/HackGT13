import { now } from "@/lib/clock";
import { membersOf, postingIdentity } from "@/lib/data";
import { suggestMutualAidFromText } from "@/lib/mutual-aid-detect";
import { isDemoMode } from "@/lib/mode-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      familyId: string;
      authorId: string;
      requesterId: string;
      task: string;
      sourceText: string;
      sourcePostId?: string;
      groupId: string;
      groupName: string;
    };
    const identity = await postingIdentity(body.familyId, body.authorId);
    const members = await membersOf(identity.familyId);
    const requester = members.find((m) => m.id === body.requesterId);
    if (!requester) {
      return NextResponse.json({ error: "Requester not found." }, { status: 404 });
    }

    const suggestion = suggestMutualAidFromText(body.sourceText, members, body.requesterId);
    if (!suggestion) {
      return NextResponse.json({ error: "Not a local assistance request." }, { status: 400 });
    }

    const demo = await isDemoMode();
    const forwardedAt = demo ? now() : new Date().toISOString();

    return NextResponse.json({
      ok: true,
      forwardedAt,
      groupId: body.groupId,
      groupName: body.groupName,
      task: body.task,
      requesterName: requester.name.split(" ")[0],
      message: `Forwarded to ${body.groupName}. A local volunteer will reach out to ${requester.name.split(" ")[0]} about: ${body.task}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not forward request." },
      { status: 403 },
    );
  }
}
