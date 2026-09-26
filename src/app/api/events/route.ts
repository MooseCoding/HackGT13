import { parseEvent } from "@/lib/calendar-parse";
import { addEventRow, eventsOf, membersOf, resolveFamilyId } from "@/lib/data";
import { createSupabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const familyId = req.nextUrl.searchParams.get("familyId") || (await resolveFamilyId());
  const localEvents = await eventsOf(familyId);
  let googleEvents: any[] = [];

  try {
    const supabase = await createSupabaseServer();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    const googleAccessToken = session?.provider_token;

    if (googleAccessToken) {
      // 1. Build query to get only the next 3 upcoming events
      const timeMin = new Date().toISOString();
      const params = new URLSearchParams({
        timeMin: timeMin,
        maxResults: "3", // Set to "1" if you strictly want only the very next event
        singleEvents: "true", // Expands recurring events into single instances
        orderBy: "startTime", // Requires singleEvents: true
      });

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${googleAccessToken}`,
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        
        // 2. Map Google events to match your local event schema
        googleEvents = (data.items || []).map((ge: any) => ({
          id: `google_${ge.id}`,
          familyId,
          title: ge.summary || "Google Calendar Event",
          startsAt: ge.start?.dateTime || ge.start?.date || timeMin,
          endsAt: ge.end?.dateTime || ge.end?.date,
          location: ge.location || "",
          attendees: [],
          sourceText: ge.summary || "Google Calendar Event",
          createdBy: "google",
          isGoogleSynced: true,
          googleEventId: ge.id ?? null,
        }));
      }
    }
  } catch (err) {
    console.error("Google Calendar fetch error:", err);
  }

  // 3. Merge and return
  return NextResponse.json({ events: [...localEvents, ...googleEvents] });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { familyId: string; authorId: string; text: string };
  const event = parseEvent(body.text, await membersOf(body.familyId), body.authorId, body.familyId);
  return NextResponse.json(await addEventRow(event));
}