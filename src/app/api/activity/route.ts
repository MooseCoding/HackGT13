import { recordActivity } from "@/lib/activity";
import { now } from "@/lib/clock";
import { postingIdentity } from "@/lib/data";
import { isDemoMode } from "@/lib/mode-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { familyId: string; memberId: string };
    const identity = await postingIdentity(body.familyId, body.memberId);
    const demo = await isDemoMode();
    const at = recordActivity(identity.familyId, identity.memberId, "app", demo ? now() : new Date().toISOString());
    return NextResponse.json({ ok: true, at });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not record activity." },
      { status: 403 },
    );
  }
}
