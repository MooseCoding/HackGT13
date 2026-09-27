import { lastMemberActivityAt } from "./activity";
import type { Member, Post, PostReaction, SafeCheckInStage, SafeCheckInStatus } from "./types";

const CHECK_IN_HOURS = 24;
const DEMO_CHECK_IN_HOURS = 18;
const ALERT_AFTER_PROMPT_HOURS = 12;

type CheckInRecord = {
  memberId: string;
  familyId: string;
  promptSentAt?: string;
  acknowledgedAt?: string;
  alertSentAt?: string;
};

const g = globalThis as typeof globalThis & { __hearthCheckIns?: CheckInRecord[] };

function records() {
  if (!g.__hearthCheckIns) g.__hearthCheckIns = [];
  return g.__hearthCheckIns;
}

function firstName(member: Member) {
  return member.name.split(" ")[0];
}

function isElder(member: Member) {
  return member.age >= 65 || Boolean(member.easyModeDefault);
}

function hoursSince(iso: string, anchor: Date) {
  return (anchor.getTime() - new Date(iso).getTime()) / (1000 * 60 * 60);
}


function primaryContact(members: Member[], inactive: Member): Member | undefined {
  return members
    .filter((m) => m.id !== inactive.id && m.age >= 25 && m.age < 65)
    .sort((a, b) => {
      const aLocal = a.location.toLowerCase() === inactive.location.toLowerCase() ? 0 : 1;
      const bLocal = b.location.toLowerCase() === inactive.location.toLowerCase() ? 0 : 1;
      if (aLocal !== bLocal) return aLocal - bLocal;
      return a.age - b.age;
    })[0];
}

function recordFor(familyId: string, memberId: string) {
  return records().find((r) => r.familyId === familyId && r.memberId === memberId);
}

export function markCheckInPromptSent(familyId: string, memberId: string, at: string) {
  const list = records();
  const existing = recordFor(familyId, memberId);
  if (existing?.promptSentAt) return existing;
  const row: CheckInRecord = existing ?? { familyId, memberId };
  row.promptSentAt = at;
  if (!existing) list.push(row);
  return row;
}

export function markCheckInAcknowledged(familyId: string, memberId: string, at: string) {
  const list = records();
  const existing = recordFor(familyId, memberId) ?? { familyId, memberId };
  existing.acknowledgedAt = at;
  if (!existing.promptSentAt) existing.promptSentAt = at;
  if (!list.includes(existing)) list.push(existing);
  return existing;
}

export function markCheckInAlertSent(familyId: string, memberId: string, at: string) {
  const existing = recordFor(familyId, memberId) ?? { familyId, memberId };
  existing.alertSentAt = at;
  if (!records().includes(existing)) records().push(existing);
  return existing;
}

export function evaluateSafeCheckIns(input: {
  posts: Post[];
  reactions?: PostReaction[];
  members: Member[];
  familyId: string;
  anchor: Date;
  demo?: boolean;
}): SafeCheckInStatus[] {
  const threshold = input.demo ? DEMO_CHECK_IN_HOURS : CHECK_IN_HOURS;
  const statuses: SafeCheckInStatus[] = [];
  const reactions = input.reactions ?? [];

  for (const member of input.members.filter(isElder)) {
    const lastAt = lastMemberActivityAt(input.posts, reactions, input.familyId, member.id);
    if (!lastAt) continue;

    const hours = hoursSince(lastAt, input.anchor);
    if (hours < threshold) continue;

    const rec = recordFor(input.familyId, member.id);
    if (rec?.acknowledgedAt && hoursSince(rec.acknowledgedAt, input.anchor) < threshold) continue;

    let stage: SafeCheckInStage = "prompt";
    if (rec?.promptSentAt) {
      const sincePrompt = hoursSince(rec.promptSentAt, input.anchor);
      stage = sincePrompt >= ALERT_AFTER_PROMPT_HOURS && !rec.acknowledgedAt ? "alert" : "prompt";
    }

    const contact = primaryContact(input.members, member);
    const pingMessage =
      stage === "alert"
        ? `${firstName(member)} hasn't checked in recently. ${contact ? `${firstName(contact)}, ` : ""}could someone send a note?`
        : `Haven't heard from ${firstName(member)} today. Tap below to send a quick hello to the family.`;

    statuses.push({
      memberId: member.id,
      memberName: firstName(member),
      hoursSinceActivity: Math.round(hours),
      stage,
      pingMessage,
      primaryContactId: contact?.id,
      primaryContactName: contact ? firstName(contact) : undefined,
    });
  }

  return statuses.sort((a, b) => b.hoursSinceActivity - a.hoursSinceActivity);
}
