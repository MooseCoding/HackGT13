import { recordActivity } from "@/lib/activity";
import { now } from "@/lib/clock";
import { postingIdentity } from "@/lib/data";
import { isDemoMode } from "@/lib/mode-server";
import { addReaction, reactionsForPost, reactionsOf } from "@/lib/reactions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const familyId = req.nextUrl.searchParams.get("familyId");
  const postId = req.nextUrl.searchParams.get("postId");
  if (!familyId) {
    return NextResponse.json({ error: "familyId required." }, { status: 400 });
  }

  try {
    const memberId = req.nextUrl.searchParams.get("memberId");
    if (memberId) await postingIdentity(familyId, memberId);
    const reactions = postId ? reactionsForPost(familyId, postId) : reactionsOf(familyId);
    return NextResponse.json({ reactions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load reactions." },
      { status: 403 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      familyId: string;
      memberId: string;
      postId: string;
      emoji: string;
    };
    const identity = await postingIdentity(body.familyId, body.memberId);
    const demo = await isDemoMode();
    const at = demo ? now() : new Date().toISOString();
    const reaction = addReaction({
      familyId: identity.familyId,
      postId: body.postId,
      memberId: identity.memberId,
      emoji: body.emoji.slice(0, 4),
      at,
    });
    recordActivity(identity.familyId, identity.memberId, "reaction", at);
    return NextResponse.json({ reaction });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not add reaction." },
      { status: 403 },
    );
  }
}
