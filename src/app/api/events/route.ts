import { parseEvent } from "@/lib/calendar-parse";
import { addEvent, eventsOf, membersOf } from "@/lib/store";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

// Initialize the Google OAuth2 client with your environment variables
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET(req: NextRequest) {
  const familyId = req.nextUrl.searchParams.get("familyId") || "alvarez";
  
  // 1. Fetch the local store events
  const localEvents = eventsOf(familyId);
  
  // 2. Attempt to pull from Google Calendar
  let googleEvents: any[] = [];
  const userRefreshToken = req.cookies.get("google_refresh_token")?.value;

  if (userRefreshToken) {
    try {
      oauth2Client.setCredentials({ refresh_token: userRefreshToken });
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });
      
      const response = await calendar.events.list({
        calendarId: "primary", // Accesses the currently logged in user's primary calendar
        timeMin: new Date().toISOString(),
        maxResults: 20,
        singleEvents: true,
        orderBy: "startTime", // Returns events chronologically
      });
      
      const fetchedGoogleEvents = response.data.items || [];
      
      // Transform Google events to match your Hearth CalendarEvent interface
      googleEvents = fetchedGoogleEvents.map((ge) => ({
        id: ge.id || `google_${Date.now()}`,
        familyId,
        authorId: "google_sync",
        title: ge.summary || "Google Calendar Event",
        startsAt: ge.start?.dateTime || ge.start?.date || new Date().toISOString(),
        location: ge.location || "",
        attendees: [], 
      }));
    } catch (error) {
      console.error("Failed to fetch Google Calendar events:", error);
    }
  }

  // 3. Return the merged events array
  return NextResponse.json({ events: [...localEvents, ...googleEvents] });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { 
    familyId: string; 
    authorId: string; 
    text: string; 
    syncToGoogle?: boolean 
  };
  
  // 1. Parse and add to local Hearth store
  const event = parseEvent(body.text, membersOf(body.familyId), body.authorId, body.familyId);
  addEvent(event);

  // 2. Add to Google Calendar if requested by the client UI
  if (body.syncToGoogle) {
    const userRefreshToken = req.cookies.get("google_refresh_token")?.value;
    
    if (userRefreshToken) {
      try {
        oauth2Client.setCredentials({ refresh_token: userRefreshToken });
        const calendar = google.calendar({ version: "v3", auth: oauth2Client });
        
        // Calculate an end time (assuming 1 hour duration by default)
        const endTime = new Date(new Date(event.startsAt).getTime() + 60 * 60 * 1000);

        await calendar.events.insert({
          calendarId: "primary",
          requestBody: {
            summary: event.title,
            location: event.location,
            description: `Added via Hearth by ${body.authorId}`,
            start: { dateTime: event.startsAt }, // Start time of the event
            end: { dateTime: endTime.toISOString() }, // End time of the event
          },
        });
      } catch (error) {
        console.error("Failed to insert event to Google Calendar:", error);
      }
    }
  }

  return NextResponse.json(event);
}