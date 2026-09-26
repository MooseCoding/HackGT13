import { parseEvent } from "@/lib/calendar-parse";
import { addEvent, eventsOf, membersOf } from "@/lib/store";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const familyId = req.nextUrl.searchParams.get("familyId") || "alvarez";
  return NextResponse.json({ events: eventsOf(familyId) });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { familyId: string; authorId: string; text: string };
  const event = parseEvent(body.text, membersOf(body.familyId), body.authorId, body.familyId);
  addEvent(event);
  return NextResponse.json(event);
}
