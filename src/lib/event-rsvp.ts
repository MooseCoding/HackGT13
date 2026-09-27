import type { CalendarEvent, MemberId, RsvpStatus } from "./types";

export function rsvpCounts(attending: Partial<Record<MemberId, RsvpStatus>> = {}) {
  let yes = 0;
  let maybe = 0;
  let no = 0;
  for (const status of Object.values(attending)) {
    if (status === "yes") yes++;
    else if (status === "maybe") maybe++;
    else if (status === "no") no++;
  }
  return { yes, maybe, no };
}

export function canRsvp(event: CalendarEvent) {
  return !event.isGoogleSynced && !event.id.startsWith("google_");
}

export function nextAttending(
  event: CalendarEvent,
  memberId: MemberId,
  status: RsvpStatus,
): Partial<Record<MemberId, RsvpStatus>> {
  const attending = { ...(event.attending ?? {}) };
  if (attending[memberId] === status) {
    delete attending[memberId];
  } else {
    attending[memberId] = status;
  }
  return attending;
}
