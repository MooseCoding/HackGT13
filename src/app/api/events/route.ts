import { parseEvent } from "@/lib/calendar-parse";
import { CAL_WEEKS, inCalendarWindow, windowBounds } from "@/lib/calendar-window";
import { calendarAnchor } from "@/lib/clock";
import { addEventRow, deleteEventRow, eventsOf, membersOf, postingIdentity, resolveFamilyId } from "@/lib/data";
import {
  createGoogleEvent,
  deleteGoogleEvent,
  fetchGoogleEvents,
  googleAccessToken,
} from "@/lib/google-calendar";
import { isDemoMode } from "@/lib/mode-server";
import { NextRequest, NextResponse } from "next/server";

/** How many past + future Google events to surface inside the Hearth window. */
const GOOGLE_PAST = 40;
const GOOGLE_FUTURE = 40;

export async function GET(req: NextRequest) {
  const familyId = req.nextUrl.searchParams.get("familyId") || (await resolveFamilyId());
  const demo = await isDemoMode();
  const anchor = calendarAnchor(demo);
  const clientToken = req.nextUrl.searchParams.get("googleToken");
  const local = (await eventsOf(familyId)).filter((e) => inCalendarWindow(e.startsAt, anchor));

  let google: Awaited<ReturnType<typeof fetchGoogleEvents>> = [];
  let googleConnected = false;
  try {
    const token = await googleAccessToken(clientToken);
    googleConnected = Boolean(token);
    if (token) {
      const { min, max } = windowBounds(anchor);
      const all = await fetchGoogleEvents(familyId, token, min, max);
      const now = anchor.getTime();
      const past = all.filter((e) => new Date(e.startsAt).getTime() < now);
      const future = all.filter((e) => new Date(e.startsAt).getTime() >= now);
      google = [...past.slice(-GOOGLE_PAST), ...future.slice(0, GOOGLE_FUTURE)];
    }
  } catch (err) {
    console.error("Google Calendar fetch error:", err);
  }

  // Prefer Google copy when the same title+start was also saved locally after sync.
  const googleKeys = new Set(
    google.map((e) => `${e.title.trim().toLowerCase()}|${new Date(e.startsAt).toISOString()}`),
  );
  const localDeduped = local.filter(
    (e) => !googleKeys.has(`${e.title.trim().toLowerCase()}|${new Date(e.startsAt).toISOString()}`),
  );

  return NextResponse.json({
    events: [...localDeduped, ...google].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    googleConnected,
    googleCount: google.length,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      familyId: string;
      authorId: string;
      text: string;
      calendar?: "family" | "mine";
      syncToGoogle?: boolean;
      googleToken?: string;
    };
    const identity = await postingIdentity(body.familyId, body.authorId);
    const demo = await isDemoMode();
    const anchor = calendarAnchor(demo);
    const members = await membersOf(identity.familyId);

    let event = parseEvent(body.text, members, identity.memberId, identity.familyId, anchor);
    if (!inCalendarWindow(event.startsAt, anchor)) {
      return NextResponse.json(
        { error: `Pick a date within ${CAL_WEEKS} weeks before or after today.` },
        { status: 400 },
      );
    }

    if (body.calendar === "mine") {
      event = { ...event, attendees: [identity.memberId] };
    } else if (event.attendees.length <= 1) {
      event = { ...event, attendees: members.map((m) => m.id) };
    }

    const saved = await addEventRow(event);

    if (body.syncToGoogle) {
      const token = await googleAccessToken(body.googleToken);
      if (!token) {
        return NextResponse.json(
          { ...saved, warning: "Added here. Sign in with Google to also add it there." },
        );
      }
      try {
        await createGoogleEvent(token, saved);
      } catch (err) {
        console.error("Google push error:", err);
        return NextResponse.json(
          { ...saved, warning: "Added here, but couldn't add to Google Calendar. Try signing in again." },
        );
      }
    }

    return NextResponse.json(saved);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create event." },
      { status: 403 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    const familyId = req.nextUrl.searchParams.get("familyId") || (await resolveFamilyId());
    const googleEventId = req.nextUrl.searchParams.get("googleEventId");
    const clientToken = req.nextUrl.searchParams.get("googleToken");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const isGoogleOnly = id.startsWith("google_");

    if (googleEventId) {
      const token = await googleAccessToken(clientToken);
      if (!token) {
        return NextResponse.json(
          { error: "Sign in with Google to remove this event." },
          { status: 401 },
        );
      }
      await deleteGoogleEvent(token, googleEventId);
    }

    if (!isGoogleOnly) {
      await deleteEventRow(id, familyId);
    } else if (!googleEventId) {
      return NextResponse.json({ error: "Cannot delete this event." }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 },
    );
  }
}
