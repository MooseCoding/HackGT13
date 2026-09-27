import type { Member, MutualAidSuggestion, VolunteerGroup } from "./types";

const ASSISTANCE_CUE_RE =
  /\b(can't reach|cannot reach|can't lift|can't move|can't get|can't pick up|need help|help me|fell over|too heavy|heavy groceries|groceries are heavy|set up my|tv remote|remote control|porch chair|lawn furniture|anyone nearby|someone local|someone nearby|hard to reach|reach it|carry|hauling|stuck outside|door is heavy|fix my|broken handle|can't open)\b/i;

const MEDICAL_SKIP_RE =
  /\b(doctor|hospital|ambulance|911|emergency|chest pain|stroke|fall and hit|bleeding|medicine|pill|dizzy|faint)\b/i;

const VOLUNTEER_TEMPLATES: VolunteerGroup[] = [
  {
    id: "grant-park-neighbors",
    name: "Grant Park Neighbors Network",
    blurb: "Block captains and retirees who swap small favors within a mile.",
  },
  {
    id: "gt-service",
    name: "Georgia Tech Community Service Club",
    blurb: "Student volunteers matched for light errands near campus.",
  },
  {
    id: "decatur-aid",
    name: "Decatur Mutual Aid Circle",
    blurb: "Local helpers for groceries, yard work, and tech setup.",
  },
  {
    id: "emory-volunteers",
    name: "Emory Student Volunteers",
    blurb: "Undergrads who sign up for neighbor check-ins and errands.",
  },
];

function firstName(member: Member) {
  return member.name.split(" ")[0];
}

function locationBlob(members: Member[]) {
  return members
    .map((m) => `${m.location} ${m.city ?? ""} ${m.state ?? ""}`.toLowerCase())
    .join(" ");
}

function volunteerGroupsForFamily(members: Member[]): VolunteerGroup[] {
  const blob = locationBlob(members);
  const picks: VolunteerGroup[] = [];

  if (/grant park|inman|atlanta|georgia tech|grady/.test(blob)) {
    picks.push(VOLUNTEER_TEMPLATES[0], VOLUNTEER_TEMPLATES[1]);
  }
  if (/decatur|emory/.test(blob)) {
    picks.push(VOLUNTEER_TEMPLATES[2], VOLUNTEER_TEMPLATES[3]);
  }

  if (!picks.length) {
    return [VOLUNTEER_TEMPLATES[0], VOLUNTEER_TEMPLATES[2]];
  }

  const seen = new Set<string>();
  return picks.filter((g) => {
    if (seen.has(g.id)) return false;
    seen.add(g.id);
    return true;
  });
}

function extractTask(raw: string): string {
  let text = raw.trim();
  text = text.replace(/^(hi|hello|hey|mijo|mija|family,?\s*)/i, "");
  text = text.replace(/\?\s*$/, "").trim();
  if (text.length > 96) return `${text.slice(0, 93)}…`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Cheap first pass — skip volunteer matching unless this is a local help request. */
export function looksLikeMutualAidText(text: string) {
  const raw = text.trim();
  if (raw.length < 8) return false;
  if (MEDICAL_SKIP_RE.test(raw)) return false;
  return ASSISTANCE_CUE_RE.test(raw);
}

/** Regex-based local assistance detection (no network). */
export function suggestMutualAidFromText(
  text: string,
  members: Member[],
  authorId: string,
): MutualAidSuggestion | null {
  const raw = text.trim();
  if (!looksLikeMutualAidText(raw)) return null;

  const requester = members.find((m) => m.id === authorId);
  if (!requester) return null;

  const groups = volunteerGroupsForFamily(members);
  if (!groups.length) return null;

  return {
    task: extractTask(raw),
    requesterId: requester.id,
    requesterName: firstName(requester),
    sourceText: raw,
    groups,
  };
}
