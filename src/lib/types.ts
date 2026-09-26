export type MemberId = string;
export type FamilyId = string;

export type PostKind = "text" | "voice" | "photo" | "status";

export type Member = {
  id: MemberId;
  familyId: FamilyId;
  name: string;
  role: string;
  age: number;
  initials: string;
  color: string;
  /** Display summary; prefer street/city/state/postal when present. */
  location: string;
  street?: string;
  apt?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  clinicalOptIn: boolean;
  easyModeDefault?: boolean;
};

export type Post = {
  id: string;
  familyId: FamilyId;
  authorId: MemberId;
  kind: PostKind;
  body: string;
  createdAt: string;
  /** "group" for family chat, or dm:{id}:{id} for direct messages */
  threadId?: string;
  photoUrl?: string;
  photoAlt?: string;
  voiceSeconds?: number;
  transcript?: string;
};

export type CalendarEvent = {
  id: string;
  familyId: FamilyId;
  title: string;
  startsAt: string;
  endsAt?: string;
  location?: string;
  attendees: MemberId[];
  sourceText: string;
  createdBy: MemberId;
  isGoogleSynced?: boolean;
  googleEventId?: string | null;
};

export type Family = {
  id: FamilyId;
  name: string;
  tagline: string;
  inviteCode?: string;
};

export type Digest = {
  id: string;
  familyId: FamilyId;
  weekOf: string;
  title: string;
  narrative: string;
  highlights: string[];
  theme?: string;
  generatedAt: string;
  /** How the story was written — Groq when key present, else local templates. */
  source?: "groq" | "local";
};

export type DailyPoint = {
  date: string;
  posts: number;
  lexicalDiversity: number;
  meanSentenceLength: number;
  sentiment: number;
  nightPosts: number;
};

export type ClinicalFlag = {
  code: "engagement_change" | "sleep_shift";
  severity: "watch" | "elevated" | "high";
  title: string;
  detail: string;
};

export type InsightEvidence = {
  postId: string;
  createdAt: string;
  text: string;
  tags?: string[];
};

export type ExplainableInsight = {
  status: "ready" | "insufficient_data";
  title: string;
  summary: string;
  currentLabel: string;
  baselineLabel: string;
  currentRange: { start: string; end: string };
  baselineRange: { start: string; end: string };
  evidence: InsightEvidence[];
};

export type PatientSnapshot = {
  memberId: MemberId;
  familyId: FamilyId;
  windowDays: number;
  baselineDays: number;
  lexicalDiversity: number;
  lexicalDiversityDelta: number;
  meanSentenceLength: number;
  sentenceLengthDelta: number;
  repetitionScore: number;
  sentiment: number;
  sentimentDelta: number;
  engagementPerWeek: number;
  engagementDelta: number;
  morningShare: number;
  morningShareDelta: number;
  nightShare: number;
  responseHours?: number;
  flags: ClinicalFlag[];
  insight: ExplainableInsight;
  note: string;
  series: DailyPoint[];
};
