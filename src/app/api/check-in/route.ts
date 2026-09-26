import { calendarAnchor, now } from "@/lib/clock";
import { membersOf, postingIdentity, postsOf } from "@/lib/data";
import {
  evaluateSafeCheckIns,
  markCheckInAcknowledged,
  markCheckInAlertSent,
  markCheckInPromptSent,
} from "@/lib/check-in-detect";
import { reactionsOf } from "@/lib/reactions";
import { isDemoMode } from "@/lib/mode-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const familyId = req.nextUrl.searchParams.get("familyId");
  const memberId = req.nextUrl.searchParams.get("memberId");
  if (!familyId || !memberId) {
    return NextResponse.json({ error: "familyId and memberId required." }, { status: 400 });
  }

  try {
    await postingIdentity(familyId, memberId);
    const demo = await isDemoMode();
    const anchor = calendarAnchor(demo);
    const [posts, members, reactions] = await Promise.all([
      postsOf(familyId),
      membersOf(familyId),
      Promise.resolve(reactionsOf(familyId)),
    ]);
    const statuses = evaluateSafeCheckIns({ posts, reactions, members, familyId, anchor, demo });

    for (const status of statuses) {
      if (status.stage === "prompt") {
        markCheckInPromptSent(familyId, status.memberId, demo ? now() : anchor.toISOString());
      } else if (status.stage === "alert") {
        markCheckInAlertSent(familyId, status.memberId, demo ? now() : anchor.toISOString());
      }
    }

    return NextResponse.json({ statuses, source: demo ? "demo" : "live" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not evaluate check-in." },
      { status: 403 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      familyId: string;
      memberId: string;
      targetMemberId: string;
      action: "acknowledge" | "alert";
    };
    const identity = await postingIdentity(body.familyId, body.memberId);
    const demo = await isDemoMode();
    const at = demo ? now() : new Date().toISOString();

    if (body.action === "acknowledge") {
      markCheckInAcknowledged(identity.familyId, body.targetMemberId, at);
    } else {
      markCheckInAlertSent(identity.familyId, body.targetMemberId, at);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update check-in." },
      { status: 403 },
    );
  }
}
