import type { CalendarEvent } from "./types";

function normTitle(title: string) {
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

export function eventsMatch(a: CalendarEvent, b: CalendarEvent) {
  const dt = Math.abs(new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  if (dt > 5 * 60_000) return false;
  const ta = normTitle(a.title);
  const tb = normTitle(b.title);
  return ta === tb || ta.includes(tb) || tb.includes(ta);
}

function eventScope(e: CalendarEvent): "family" | "mine" {
  if (e.calendarScope === "family" || e.calendarScope === "mine") return e.calendarScope;
  if (e.isGoogleSynced) return "mine";
  return e.attendees.length === 1 ? "mine" : "family";
}

/** Drop Google copies of events we already store locally (e.g. after sync). */
export function mergeCalendarEvents(local: CalendarEvent[], google: CalendarEvent[]) {
  const extra = google.filter((g) => {
    return !local.some((l) => {
      if (l.googleEventId && g.googleEventId && l.googleEventId === g.googleEventId) return true;
      if (!eventsMatch(l, g)) return false;
      return eventScope(l) === eventScope(g);
    });
  });
  return [...local, ...extra];
}
