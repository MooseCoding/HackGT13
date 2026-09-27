import { inCalendarWindow } from "./calendar-window";
import { formatWhen } from "./clock";
import { familyCallReminderSource, parseFamilyCallFrequency } from "./family-call-frequency";
import { FAMILY_CALL_SOURCE, isFamilyCall } from "./family-call-schedule";
import type { CalendarEvent, Member, Reminder } from "./types";

export type CalendarReminderDraft = {
  assigneeId: string;
  text: string;
  dueAt: string;
  dueHint: string;
  sourceText: string;
  sourceEventId: string;
  createdBy: string;
};

function firstName(member: Member) {
  return member.name.split(" ")[0];
}

function isMiddleGen(member: Member) {
  return member.age >= 35 && member.age <= 60;
}

function isYoung(member: Member) {
  return member.age <= 25;
}

function isAway(member: Member, eventLocation?: string) {
  if (!eventLocation || !member.location) return false;
  const loc = eventLocation.toLowerCase();
  const home = member.location.toLowerCase();
  const homeToken = home.split(/[\s,·]+/)[0];
  const locToken = loc.split(/[\s,·]+/)[0];
  return homeToken.length > 2 && locToken.length > 2 && !loc.includes(homeToken) && !home.includes(locToken);
}

function pickDriver(members: Member[], attendeeIds: string[]) {
  const middle = members.filter((m) => attendeeIds.includes(m.id) && isMiddleGen(m));
  if (middle.length) return middle[0].id;
  const adult = members.find((m) => attendeeIds.includes(m.id) && !isYoung(m));
  return adult?.id ?? null;
}

function youngAttendee(members: Member[], attendeeIds: string[]) {
  return members.find((m) => attendeeIds.includes(m.id) && isYoung(m));
}

function elderAttendee(members: Member[], attendeeIds: string[]) {
  return members.find((m) => attendeeIds.includes(m.id) && (m.easyModeDefault || m.age >= 65));
}

function eventBlob(event: CalendarEvent) {
  return [event.title, event.location, event.sourceText].filter(Boolean).join(" ").toLowerCase();
}

/** Local keyword rules — one or more reminders per calendar event. */
export function remindersFromCalendarEvent(
  event: CalendarEvent,
  members: Member[],
  anchor: Date,
): CalendarReminderDraft[] {
  if (event.calendarScope === "mine") return [];
  if (!inCalendarWindow(event.startsAt, anchor)) return [];
  if (new Date(event.startsAt).getTime() < anchor.getTime() - 60 * 60 * 1000) return [];

  const familyMembers = members.filter((m) => m.familyId === event.familyId);
  const attendeeIds = event.attendees.filter((id) => familyMembers.some((m) => m.id === id));
  if (!attendeeIds.length) return [];

  const blob = eventBlob(event);
  const dueHint = formatWhen(event.startsAt);
  const sourceText = isFamilyCall(event)
    ? familyCallReminderSource(
        event.sourceText?.startsWith("hearth:family-call:")
          ? parseFamilyCallFrequency(event.sourceText.slice("hearth:family-call:".length))
          : event.sourceText === FAMILY_CALL_SOURCE
            ? "weekly"
            : "weekly",
      )
    : event.sourceText?.trim() || event.title;
  const base = {
    sourceEventId: event.id,
    createdBy: event.createdBy,
    dueAt: event.startsAt,
    dueHint,
    sourceText,
  };
  const drafts: CalendarReminderDraft[] = [];

  const add = (assigneeId: string | null | undefined, text: string) => {
    if (!assigneeId) return;
    drafts.push({ ...base, assigneeId, text });
  };

  if (/\bpick\s*up|pickup|garden pickup\b/.test(blob)) {
    const driver = pickDriver(familyMembers, attendeeIds);
    if (/\btomato|garden|fence|harvest|basil\b/.test(blob)) {
      add(driver, "Pick up tomatoes from the south fence");
    } else {
      const elder = elderAttendee(familyMembers, attendeeIds);
      add(driver, elder ? `Pick up ${firstName(elder)} — ${event.title}` : `Pick up for ${event.title}`);
    }
    return drafts;
  }

  if (/\bsoccer|tournament|game|match|practice|sport|varsity\b/.test(blob)) {
    const kid = youngAttendee(familyMembers, attendeeIds);
    const driver = pickDriver(familyMembers, attendeeIds);
    if (kid && driver) {
      add(driver, `Drive ${firstName(kid)} to ${event.title.charAt(0).toLowerCase() + event.title.slice(1)}`);
    }
    return drafts;
  }

  if (/\bdinner|lunch|brunch|breakfast|digest|stew|book club|family meal\b/.test(blob)) {
    const away = familyMembers.filter((m) => attendeeIds.includes(m.id) && isAway(m, event.location));
    for (const member of away) {
      const verb = /\bdigest|come home\b/.test(blob) ? "Come home for" : "Head to";
      add(member.id, `${verb} ${event.title.charAt(0).toLowerCase() + event.title.slice(1)}`);
    }
    if (/\bbook club|jollof\b/.test(blob)) {
      const helper = familyMembers.find(
        (m) => attendeeIds.includes(m.id) && isMiddleGen(m) && m.id !== event.createdBy,
      );
      add(helper?.id, `Bring food to ${event.title.charAt(0).toLowerCase() + event.title.slice(1)}`);
    }
    return drafts;
  }

  if (/\bdrive|drop[\s-]?off|beltline walk|walk with\b/.test(blob)) {
    const driver = pickDriver(familyMembers, attendeeIds);
    const passenger = elderAttendee(familyMembers, attendeeIds);
    if (driver && passenger) {
      add(driver, `Drive ${firstName(passenger)} to ${event.title.charAt(0).toLowerCase() + event.title.slice(1)}`);
    }
    return drafts;
  }

  if (/\bfamily call|facetime|video call|zoom\b/.test(blob)) {
    for (const id of attendeeIds) add(id, `Join ${event.title}`);
    return drafts;
  }

  if (/\bdoctor|dentist|appointment|checkup|clinic\b/.test(blob)) {
    const patient = familyMembers.find(
      (m) => attendeeIds.includes(m.id) && (m.easyModeDefault || isYoung(m)),
    );
    const caregiver = pickDriver(familyMembers, attendeeIds);
    if (patient) add(patient.id, `Attend ${event.title}`);
    if (caregiver && caregiver !== patient?.id) {
      add(
        caregiver,
        patient
          ? `Drive ${firstName(patient)} to ${event.title.charAt(0).toLowerCase() + event.title.slice(1)}`
          : `Drive to ${event.title.charAt(0).toLowerCase() + event.title.slice(1)}`,
      );
    }
    return drafts;
  }

  return drafts;
}

function draftKey(draft: CalendarReminderDraft) {
  return `${draft.sourceEventId}|${draft.assigneeId}|${draft.text.toLowerCase()}`;
}

/** Merge calendar events into reminder drafts, skipping ones already tracked. */
export function remindersFromCalendar(
  events: CalendarEvent[],
  members: Member[],
  existing: Reminder[],
  anchor: Date,
): CalendarReminderDraft[] {
  const claimedEvents = new Set(existing.map((r) => r.sourceEventId).filter(Boolean));
  const claimedKeys = new Set(existing.map((r) => `${r.assigneeId}|${r.dueAt ?? ""}|${r.text.toLowerCase()}`));

  const out: CalendarReminderDraft[] = [];
  const seen = new Set<string>();

  for (const event of events) {
    if (claimedEvents.has(event.id)) continue;
    for (const draft of remindersFromCalendarEvent(event, members, anchor)) {
      const key = draftKey(draft);
      if (seen.has(key) || claimedKeys.has(`${draft.assigneeId}|${draft.dueAt}|${draft.text.toLowerCase()}`)) {
        continue;
      }
      seen.add(key);
      out.push(draft);
    }
  }

  return out;
}
