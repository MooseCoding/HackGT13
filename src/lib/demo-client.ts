/**
 * Client-side demo data and mutations - no API calls during sample mode.
 * Live users continue to use /api routes.
 */

import { analyzeMember } from "./analysis";
import {
  evaluateSafeCheckIns,
  markCheckInAcknowledged,
  markCheckInAlertSent,
  markCheckInPromptSent,
} from "./check-in-detect";
import { postThreadId } from "./chat";
import { calendarAnchor, atDay, now } from "./clock";
import { buildDisorderDemoPosts, scanDisorderSignals } from "./clinical/disorder-scan";
const DEMO_CLINICIAN_ID = "demo-pcp";

type PatientAssignment = {
  memberId: string;
  clinicianId: string;
  assignedAt: string;
};
import { suggestCommerceFromText } from "./commerce-detect";
import { detectCheckInSuggestion } from "./clinical/check-in";
import { suggestMutualAidFromText } from "./mutual-aid-detect";
import { suggestReminderFromText, type ReminderSuggestion } from "./remind-detect";
import { suggestScheduleFromText } from "./schedule-detect";
import type {
  CalendarEvent,
  CommerceKind,
  CommerceSuggestion,
  Member,
  MemberInsurance,
  MutualAidSuggestion,
  PatientSnapshot,
  Post,
  PostKind,
  PostReaction,
  SafeCheckInStatus,
} from "./types";
import type { DisorderSignalHit } from "./clinical/disorder-scan";
import type { ClinicalAlertStatus } from "./clinical/operations";

type DemoStore = {
  reactions: PostReaction[];
  assignments: PatientAssignment[];
  alertStatuses: Record<string, ClinicalAlertStatus>;
  autoAcceptPatients: boolean;
  insurance: Record<string, MemberInsurance | null>;
  checkInSeeded: boolean;
};

const g = globalThis as typeof globalThis & { __hearthDemoClient?: DemoStore };

function store(): DemoStore {
  if (!g.__hearthDemoClient) {
    g.__hearthDemoClient = {
      reactions: [],
      assignments: [{ memberId: "elena", clinicianId: DEMO_CLINICIAN_ID, assignedAt: now() }],
      alertStatuses: {},
      autoAcceptPatients: false,
      insurance: {},
      checkInSeeded: false,
    };
  }
  return g.__hearthDemoClient;
}

/** Pre-seed Elena safe check-in alert stage for demos. */
export function seedDemoCheckInClient() {
  const s = store();
  if (s.checkInSeeded) return;
  s.checkInSeeded = true;
  markCheckInPromptSent("alvarez", "elena", atDay(0, 6, 0));
}

export function demoReactions(familyId: string): PostReaction[] {
  return store().reactions.filter((r) => r.familyId === familyId);
}

export function demoAddReaction(input: {
  familyId: string;
  postId: string;
  memberId: string;
  emoji: string;
}): PostReaction {
  const list = store().reactions;
  const existing = list.find(
    (r) =>
      r.familyId === input.familyId &&
      r.postId === input.postId &&
      r.memberId === input.memberId &&
      r.emoji === input.emoji,
  );
  if (existing) return existing;
  const row: PostReaction = {
    id: `rx-demo-${Date.now()}`,
    familyId: input.familyId,
    postId: input.postId,
    memberId: input.memberId,
    emoji: input.emoji,
    createdAt: now(),
  };
  list.push(row);
  return row;
}

export function demoSafeCheckIns(
  familyId: string,
  memberId: string,
  members: Member[],
  posts: Post[],
): SafeCheckInStatus[] {
  seedDemoCheckInClient();
  const anchor = calendarAnchor(true);
  const reactions = demoReactions(familyId);
  const statuses = evaluateSafeCheckIns({ posts, reactions, members, familyId, anchor, demo: true });
  for (const status of statuses) {
    if (status.stage === "prompt") {
      markCheckInPromptSent(familyId, status.memberId, now());
    } else if (status.stage === "alert") {
      markCheckInAlertSent(familyId, status.memberId, now());
    }
  }
  return statuses.filter((s) => s.memberId !== memberId);
}

export function demoAcknowledgeCheckIn(familyId: string, targetMemberId: string) {
  markCheckInAcknowledged(familyId, targetMemberId, now());
}

export function demoCreatePost(input: {
  familyId: string;
  authorId: string;
  threadId?: string;
  kind?: PostKind;
  body: string;
  photoUrl?: string;
  transcript?: string;
  voiceSeconds?: number;
  posts: Post[];
  members: Member[];
  events: CalendarEvent[];
}): {
  post: Post;
  scheduleSuggestion: ReturnType<typeof suggestScheduleFromText> | null;
  reminderSuggestion: ReminderSuggestion | null;
  mutualAidSuggestion: MutualAidSuggestion | null;
  commerceSuggestion: CommerceSuggestion | null;
  checkInSuggestion: ReturnType<typeof detectCheckInSuggestion>;
} {
  const post: Post = {
    id: `p-demo-${Date.now()}`,
    familyId: input.familyId,
    authorId: input.authorId,
    kind: input.kind ?? "text",
    body: input.body,
    createdAt: now(),
    photoUrl: input.photoUrl,
    transcript: input.transcript,
    voiceSeconds: input.voiceSeconds,
    threadId: input.threadId,
    channel: "hearth",
    rawRetained: true,
  };
  const anchor = calendarAnchor(true);
  const postText = post.transcript || post.body;
  const scheduleSuggestion = suggestScheduleFromText(postText, input.members, input.events, {
    familyId: input.familyId,
    createdBy: input.authorId,
    anchor,
  });
  const reminderSuggestion = suggestReminderFromText(postText, input.members, input.authorId, anchor);
  const mutualAidSuggestion = suggestMutualAidFromText(postText, input.members, input.authorId);
  const threadPosts = [...input.posts.filter((p) => postThreadId(p) === postThreadId(post)), post];
  const priorPost = threadPosts.length > 1 ? threadPosts[threadPosts.length - 2] : undefined;
  const priorMessage = priorPost ? priorPost.transcript || priorPost.body : undefined;
  const commerceSuggestion = suggestCommerceFromText(postText, input.members, input.authorId, {
    events: input.events,
    priorMessage,
  });
  const checkInSuggestion = detectCheckInSuggestion(postText);
  return {
    post,
    scheduleSuggestion,
    reminderSuggestion,
    mutualAidSuggestion,
    commerceSuggestion,
    checkInSuggestion,
  };
}

export function demoPlaceCommerceOrder(input: {
  recipientName: string;
  title: string;
  kind: CommerceKind;
  location?: string;
  street?: string;
  city?: string;
  state?: string;
}): { message: string } {
  const deliveryBy = input.kind === "care_package" ? "tomorrow by 6pm" : "Friday by 3pm";
  const address = input.street
    ? [input.street, input.city, input.state].filter(Boolean).join(", ")
    : input.location ?? "home";
  const message =
    input.kind === "care_package"
      ? `Demo only: care package would ship to ${input.recipientName} by ${deliveryBy}. No payment was taken.`
      : `Demo only: ${input.title} would arrive at ${address} by ${deliveryBy}. No payment was taken.`;
  return { message };
}

export function demoForwardMutualAid(groupName: string, task: string) {
  return { groupName, task };
}

export function demoDisorderScan(memberId: string, familyId: string): {
  hits: DisorderSignalHit[];
  snapshot: PatientSnapshot | null;
} {
  const intakePosts = buildDisorderDemoPosts(memberId, familyId);
  const hits = scanDisorderSignals(intakePosts);
  const allPosts = intakePosts;
  const snapshot = analyzeMember(memberId, allPosts);
  return { hits, snapshot };
}

const RUTH_SIGNAL_POSTS: Post[] = [
  {
    id: "wa-demo-ruth-1",
    familyId: "okonkwo",
    authorId: "ruth",
    kind: "voice",
    body: "WhatsApp voice note",
    transcript: "I am tired. I was going to make the stew, the stew. I cannot remember where I put the list.",
    voiceSeconds: 23,
    createdAt: atDay(5, 23, 38),
    channel: "whatsapp",
    externalMessageId: "demo-ruth-1",
    rawRetained: false,
    audioMetrics: { durationSeconds: 23, wordsPerMinute: 58, pauseRatio: 0.36, averagePauseSeconds: 1.5, hesitationRate: 0.13 },
  },
  {
    id: "wa-demo-ruth-2",
    familyId: "okonkwo",
    authorId: "ruth",
    kind: "text",
    body: "Did I tell you about the stew. I think I told you. Where is the list.",
    createdAt: atDay(3, 0, 22),
    channel: "whatsapp",
    externalMessageId: "demo-ruth-2",
    rawRetained: false,
  },
  {
    id: "wa-demo-ruth-3",
    familyId: "okonkwo",
    authorId: "ruth",
    kind: "voice",
    body: "WhatsApp voice note",
    transcript: "The list. The stew. I am feeling low today. I cannot find the list.",
    voiceSeconds: 19,
    createdAt: atDay(1, 1, 14),
    channel: "whatsapp",
    externalMessageId: "demo-ruth-3",
    rawRetained: false,
    audioMetrics: { durationSeconds: 19, wordsPerMinute: 49, pauseRatio: 0.44, averagePauseSeconds: 1.8, hesitationRate: 0.18 },
  },
];

export function demoLiveSignalSnapshot(): PatientSnapshot {
  return analyzeMember("ruth", RUTH_SIGNAL_POSTS);
}

export function demoAssignPatient(memberId: string): PatientAssignment {
  const s = store();
  const existing = s.assignments.find((a) => a.memberId === memberId);
  if (existing) return existing;
  const assignment = { memberId, clinicianId: DEMO_CLINICIAN_ID, assignedAt: now() };
  s.assignments.push(assignment);
  return assignment;
}

export function demoReleasePatient(memberId: string): boolean {
  const s = store();
  const before = s.assignments.length;
  s.assignments = s.assignments.filter((a) => a.memberId !== memberId);
  return s.assignments.length < before;
}

export function demoAutoAcceptPatients(): boolean {
  return store().autoAcceptPatients;
}

export function demoSetAutoAcceptPatients(enabled: boolean) {
  store().autoAcceptPatients = enabled;
}

export function demoUpdateAlertStatus(alertId: string, status: ClinicalAlertStatus) {
  store().alertStatuses[alertId] = status;
}

export function demoSaveInsurance(memberId: string, insurance: MemberInsurance | null) {
  store().insurance[memberId] = insurance;
}

export function demoInsuranceForMember(memberId: string): MemberInsurance | null | undefined {
  return store().insurance[memberId];
}
