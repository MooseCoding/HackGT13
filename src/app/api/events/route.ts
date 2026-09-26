import { parseEvent } from "@/lib/calendar-parse";
import { addEventRow, eventsOf, membersOf } from "@/lib/data";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const familyId = req.nextUrl.searchParams.get("familyId") || "alvarez";
  return NextResponse.json({ events: await eventsOf(familyId) });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { familyId: string; authorId: string; text: string };
  const event = parseEvent(body.text, await membersOf(body.familyId), body.authorId, body.familyId);
  return NextResponse.json(await addEventRow(event));
}
