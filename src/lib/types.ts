export type MemberId = string;
export type FamilyId = string;

export type PostKind = "text" | "voice" | "photo" | "status";

export type IntakeChannel = "hearth" | "whatsapp" | "phone" | "demo";

export type AudioMetrics = {
  durationSeconds: number;
  wordsPerMinute: number;
  pauseRatio: number;
  averagePauseSeconds: number;
  hesitationRate: number;
};

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
  channel?: IntakeChannel;
  externalMessageId?: string;
  audioMetrics?: AudioMetrics;
  /** Raw content is never required by the clinician surface. */
  rawRetained?: boolean;
};

export type ReminderStatus = "open" | "done" | "snoozed";

export type Reminder = {
  id: string;
  familyId: FamilyId;
  /** Who should do this */
  assigneeId: MemberId;
  text: string;
  dueAt?: string;
  /** Human-readable due when exact time is fuzzy, e.g. "Sunday" or "this weekend" */
  dueHint: string;
  sourceText: string;
  sourcePostId?: string;
  createdBy: MemberId;
  createdAt: string;
  status: ReminderStatus;
  snoozedUntil?: string;
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
  /** Which board this event belongs on. Google events and new local events set this explicitly. */
  calendarScope?: "family" | "mine";
  isGoogleSynced?: boolean;
  googleEventId?: string | null;
  googleCalendarId?: string | null;
};

export type Family = {
  id: FamilyId;
  name: string;
  tagline: string;
  inviteCode?: string;
  /** When true, Hearth schedules family calls without a manual "Add to calendar" step. */
  autoAddFamilyCalls?: boolean;
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
  repetition: number;
};

export type ClinicalFlag = {
  code:
    | "engagement_change"
    | "sleep_shift"
    | "lexical_change"
    | "syntax_change"
    | "repetition_change"
    | "affect_change"
    | "voice_change";
  severity: "watch" | "elevated" | "high";
  domain: "cognitive" | "social" | "affect";
  title: string;
  detail: string;
  current: string;
  baseline: string;
};

export type ClinicalDomain = {
  key: "cognitive" | "social" | "affect";
  label: string;
  score: number;
  trend: "stable" | "watch" | "changed";
  description: string;
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
  lexicalDiversityBaseline: number;
  lexicalDiversityDelta: number;
  meanSentenceLength: number;
  meanSentenceLengthBaseline: number;
  sentenceLengthDelta: number;
  repetitionScore: number;
  repetitionBaseline: number;
  repetitionDelta: number;
  sentiment: number;
  sentimentBaseline: number;
  sentimentDelta: number;
  affectRange: number;
  affectRangeBaseline: number;
  engagementPerWeek: number;
  engagementBaseline: number;
  engagementDelta: number;
  morningShare: number;
  morningShareBaseline: number;
  morningShareDelta: number;
  nightShare: number;
  nightShareBaseline: number;
  responseHours: number | null;
  responseHoursBaseline: number | null;
  responseLatencyDelta: number | null;
  voice: {
    currentSamples: number;
    baselineSamples: number;
    wordsPerMinute: number | null;
    wordsPerMinuteBaseline: number | null;
    pauseRatio: number | null;
    pauseRatioBaseline: number | null;
    hesitationRate: number | null;
    hesitationRateBaseline: number | null;
  };
  riskLevel: "stable" | "monitor" | "priority";
  confidence: "low" | "moderate" | "high";
  currentSampleSize: number;
  baselineSampleSize: number;
  domains: ClinicalDomain[];
  assessedAt: string;
  nextStep: string;
  flags: ClinicalFlag[];
  insight: ExplainableInsight;
  note: string;
  series: DailyPoint[];
};
