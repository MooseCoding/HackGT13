export type MemberId = string;
export type FamilyId = string;

export type PostKind = "text" | "voice" | "photo" | "status" | "event_pin";

export type IntakeChannel = "hearth" | "whatsapp" | "phone" | "demo";

export type AudioMetrics = {
  durationSeconds: number;
  wordsPerMinute: number;
  pauseRatio: number;
  averagePauseSeconds: number;
  hesitationRate: number;
};

export type MemberInsurance = {
  /** Demo carrier id — see INSURANCE_CARRIERS in clinical/insurance.ts */
  carrierId: string;
  policyMemberId?: string;
  groupId?: string;
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
  insurance?: MemberInsurance;
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
  /** Calendar event id for kind === "event_pin" system messages. */
  linkedEventId?: string;
};

export type PostReaction = {
  id: string;
  familyId: FamilyId;
  postId: string;
  memberId: MemberId;
  emoji: string;
  createdAt: string;
};

export type StorybookMood = "warm" | "joyful" | "calm" | "celebration";

export type StorybookPage = {
  id: string;
  title: string;
  caption: string;
  /** Short scene description for illustrated pages without photos. */
  scene?: string;
  illustration?: string;
  photoUrl?: string;
  photoAlt?: string;
  mood: StorybookMood;
};

export type PodcastChapter = {
  id: string;
  title: string;
  narration: string;
};

/** Interactive "On This Day" memory card from past family photos or stories. */
export type OnThisDayMemory = {
  id: string;
  yearsAgo: number;
  headline: string;
  story: string;
  authorName: string;
  originalDate: string;
  photoUrl?: string;
  photoAlt?: string;
  /** Short prompt to spark a reply in chat, e.g. "Ask Abuela about the lake trip." */
  sparkPrompt?: string;
  relatedPostId?: string;
};

/** Metadata for the weekly Family Radio audio digest. */
export type FamilyRadioMeta = {
  /** Approximate listen time, e.g. "~2 min". */
  durationLabel: string;
  tagline: string;
};

export type VolunteerGroup = {
  id: string;
  name: string;
  blurb: string;
};

export type MutualAidSuggestion = {
  task: string;
  requesterId: string;
  requesterName: string;
  sourceText: string;
  sourcePostId?: string;
  groups: VolunteerGroup[];
};

export type CommerceKind = "supply" | "care_package";

export type CommerceItem = {
  name: string;
  quantity?: number;
};

export type CommerceSuggestion = {
  kind: CommerceKind;
  title: string;
  items: CommerceItem[];
  recipientId: string;
  recipientName: string;
  estimatedTotal: number;
  deliveryAddress: string;
  sourceText: string;
  sourcePostId?: string;
  orderLabel: string;
  /** When ordering an unclaimed bring-list item for an event. */
  eventId?: string;
  supplyId?: string;
};

export type EventSupplyItem = {
  id: string;
  item: string;
  claimedBy?: MemberId;
};

export type LifeStoryPrompt = {
  id: string;
  forMemberId: string;
  forMemberName: string;
  aboutMemberId?: string;
  aboutMemberName?: string;
  prompt: string;
  reason?: string;
};

export type SafeCheckInStage = "none" | "prompt" | "alert";

export type SafeCheckInStatus = {
  memberId: string;
  memberName: string;
  hoursSinceActivity: number;
  stage: SafeCheckInStage;
  pingMessage: string;
  primaryContactId?: string;
  primaryContactName?: string;
};

export type WishlistStatus = "wishlist" | "ordered" | "purchased";

export type WishlistItem = {
  id: string;
  familyId: FamilyId;
  /** Who wants or needs this */
  forMemberId: MemberId;
  title: string;
  note?: string;
  kind?: CommerceKind;
  items?: CommerceItem[];
  estimatedTotal?: number;
  sourcePostId?: string;
  createdBy: MemberId;
  createdAt: string;
  status: WishlistStatus;
  orderedBy?: MemberId;
  orderedAt?: string;
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
  /** Calendar event this reminder was auto-created from. */
  sourceEventId?: string;
  createdBy: MemberId;
  createdAt: string;
  status: ReminderStatus;
  snoozedUntil?: string;
};

export type RsvpStatus = "yes" | "maybe" | "no";

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
  /** Per-member RSVP for family events. */
  attending?: Partial<Record<MemberId, RsvpStatus>>;
  /** Shared bring list for gatherings — family members claim items. */
  supplies?: EventSupplyItem[];
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
  /** How the story was written — Muse/Groq when configured, else local templates. */
  source?: "muse" | "groq" | "local";
  /** Full narration script for podcast / listen mode. */
  audioScript?: string;
  /** Chaptered audio for family news broadcast. */
  podcast?: PodcastChapter[];
  /** Stylized digital storybook pages for kids and visual browsing. */
  storybook?: StorybookPage[];
  /** Interactive nostalgia throwbacks — "On This Day" memory cards. */
  onThisDay?: OnThisDayMemory[];
  /** Family Radio broadcast metadata (browser TTS, no server audio). */
  familyRadio?: FamilyRadioMeta;
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
