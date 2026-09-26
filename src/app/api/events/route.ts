import { parseEvent } from "@/lib/calendar-parse";
import { mergedEventsOf } from "@/lib/calendar-data";
import { decorateDemoPersonalEvents } from "@/lib/demo-personal-calendars";
import { CAL_WEEKS, inCalendarWindow } from "@/lib/calendar-window";
import { calendarAnchor } from "@/lib/clock";
import { scheduleFamilyCallsForCircle } from "@/lib/auto-family-calls";
import { addEventRow, deleteEventRow, membersOf, postingIdentity, requireFamilyAccess, resolveFamilyId } from "@/lib/data";
import { deleteGoogleEvent, googleAccessToken, syncEventToGoogle } from "@/lib/google-calendar";
import { isDemoMode } from "@/lib/mode-server";
import type { CalendarEvent } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const familyId = req.nextUrl.searchParams.get("familyId") || (await resolveFamilyId());
  try {
    await requireFamilyAccess(familyId);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Access denied." },
      { status: 403 },
    );
  }
  const demo = await isDemoMode();
  const anchor = calendarAnchor(demo);
  const clientToken = req.nextUrl.searchParams.get("googleToken");

  let googleConnected = false;
  try {
    googleConnected = Boolean(await googleAccessToken(clientToken));
  } catch {
    // ignore
  }

  let events = await mergedEventsOf(familyId, {
    clientToken,
    anchor,
    googlePull: "sample",
  });

  if (demo && familyId === "alvarez") {
    googleConnected = true;
    events = decorateDemoPersonalEvents(events);
  }

  const googlePersonal = events.filter((e) => e.isGoogleSynced && e.calendarScope !== "family");

  return NextResponse.json({
    events,
    googleConnected,
    googlePersonalCount: googlePersonal.length,
    demoPersonalCalendars: demo && familyId === "alvarez",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      familyId: string;
      authorId: string;
      text?: string;
      calendar?: "family" | "mine";
      syncToGoogle?: boolean;
      googleToken?: string;
      autoWeeklyCalls?: boolean;
    };
    const identity = await postingIdentity(body.familyId, body.authorId);
    const demo = await isDemoMode();
    const anchor = calendarAnchor(demo);
    const members = await membersOf(identity.familyId);
    const token = await googleAccessToken(body.googleToken);

    if (body.autoWeeklyCalls) {
      const result = await scheduleFamilyCallsForCircle(identity.familyId, identity.memberId, {
        googleToken: token ?? undefined,
        force: true,
      });

      let warning: string | undefined;
      if (result.count && !token) {
        warning = "Added to family calendar. Connect Google Calendar to also add them there.";
      }

      return NextResponse.json({
        events: result.events,
        count: result.count,
        googleSynced: result.googleSynced,
        warning,
      });
    }

    if (!body.text?.trim()) {
      return NextResponse.json({ error: "Add a time, day, and what it is." }, { status: 400 });
    }

    let event = parseEvent(body.text, members, identity.memberId, identity.familyId, anchor);
    if (!inCalendarWindow(event.startsAt, anchor)) {
      return NextResponse.json(
        { error: `Pick a date within ${CAL_WEEKS} weeks before or after today.` },
        { status: 400 },
      );
    }

    const scope = body.calendar === "mine" ? "mine" : "family";
    event = {
      ...event,
      id: `evt-${scope === "mine" ? "m" : "f"}-${Date.now()}`,
      calendarScope: scope,
      attendees: scope === "mine" ? [identity.memberId] : members.map((m) => m.id),
    };

    let saved = await addEventRow(event);
    const wantsGoogle = body.syncToGoogle !== false;

    if (wantsGoogle && token) {
      try {
        saved = await syncEventToGoogle(token, saved);
      } catch (err) {
        console.error("Google push error:", err);
        return NextResponse.json({
          ...saved,
          warning: "Added here, but couldn't add to Google Calendar. Try reconnecting Google.",
        });
      }
    } else if (wantsGoogle && !token) {
      return NextResponse.json({
        ...saved,
        warning: "Added here. Connect Google Calendar to also add it there.",
      });
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
    await requireFamilyAccess(familyId);
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
