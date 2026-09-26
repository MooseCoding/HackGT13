import { mergeCalendarEvents } from "./calendar-merge";
import { inCalendarWindow } from "./calendar-window";
import { calendarAnchor } from "./clock";
import { eventsOf } from "./data";
import {
  fetchGoogleAroundNow,
  fetchGoogleInWindow,
  GOOGLE_EVENT_COUNT,
  googleAccessToken,
} from "./google-calendar";
import { isDemoMode } from "./mode-server";
import type { CalendarEvent } from "./types";

export type GooglePullMode = "sample" | "window";

/** Local Hearth events merged with Google Calendar (when connected). */
export async function mergedEventsOf(
  familyId: string,
  opts?: {
    clientToken?: string | null;
    anchor?: Date;
    /** sample = 5 past + 5 future from real now; window = full ±CAL_WEEKS for scheduling */
    googlePull?: GooglePullMode;
  },
): Promise<CalendarEvent[]> {
  const demo = await isDemoMode();
  const anchor = opts?.anchor ?? calendarAnchor(demo);
  const local = (await eventsOf(familyId)).filter((e) => inCalendarWindow(e.startsAt, anchor));

  let google: CalendarEvent[] = [];
  if (!demo) {
    try {
      const token = await googleAccessToken(opts?.clientToken);
      if (token) {
        const pull = opts?.googlePull ?? "window";
        if (pull === "sample") {
          // Always sample from real wall-clock time — Google is the user's actual calendar.
          google = await fetchGoogleAroundNow(familyId, token, new Date(), GOOGLE_EVENT_COUNT);
        } else {
          google = await fetchGoogleInWindow(familyId, token, anchor);
        }
      }
    } catch (err) {
      console.warn("Google Calendar fetch error:", err);
    }
  }

  return mergeCalendarEvents(local, google);
}
