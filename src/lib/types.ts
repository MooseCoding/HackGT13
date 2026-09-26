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
  location: string;
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
};

export type Family = {
  id: FamilyId;
  name: string;
  tagline: string;
};

export type Digest = {
  id: string;
  familyId: FamilyId;
  weekOf: string;
  title: string;
  narrative: string;
  highlights: string[];
  generatedAt: string;
  source: "template" | "llm";
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
  code: "cognitive_change" | "mood_isolation" | "sleep_shift";
  severity: "watch" | "elevated" | "high";
  title: string;
  detail: string;
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
  note: string;
  series: DailyPoint[];
};
