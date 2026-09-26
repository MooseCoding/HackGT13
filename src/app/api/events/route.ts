import { parseEvent } from "@/lib/calendar-parse";
import { addEventRow, eventsOf, membersOf, postingIdentity, resolveFamilyId } from "@/lib/data";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const familyId = await resolveFamilyId();
  return NextResponse.json({ events: await eventsOf(familyId) });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { familyId: string; authorId: string; text: string };
  try {
    const identity = await postingIdentity(body.familyId, body.authorId);
    const event = parseEvent(
      body.text,
      await membersOf(identity.familyId),
      identity.memberId,
      identity.familyId,
    );
    return NextResponse.json(await addEventRow(event));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create event." },
      { status: 403 },
    );
  }
}
