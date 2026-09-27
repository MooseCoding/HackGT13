"use client";

import { AddMemberPanel } from "@/components/family/AddMemberPanel";
import { FamilyrMark } from "@/components/FamilyrMark";
import { CommerceCard } from "@/components/family/CommerceCard";
import { EventBringList } from "@/components/family/EventBringList";
import {
  ConversationStarters,
  MutualAidChip,
  SocialExtensions,
  suggestMutualAidFromText,
} from "@/components/family/SocialExtensions";
import { looksLikeCommerceText, suggestCommerceFromText } from "@/lib/commerce-detect";
import {
  canClaimSupplies,
  ensureEventSupplies,
  looksLikeBringListText,
  nextSupplyClaim,
  suggestBringListFromText,
  type BringListHint,
} from "@/lib/event-supplies";
import { useFamily } from "@/components/family/FamilyChrome";
import { useHour12, useLargerText, useTimezone } from "@/components/settings/SettingsProvider";
import { assistantPreviewText, FamilyrAssistantChat } from "@/components/family/FamilyrAssistant";
import type { AssistantContext } from "@/lib/ai/assistant";
import {
  ASSISTANT_LABEL,
  ASSISTANT_THREAD,
  buildChatThreads,
  familyInitials,
  GROUP_THREAD,
  formatChatTime,
  isAssistantThread,
  isGroupThread,
  postThreadId,
  threadForDm,
  threadLabel,
} from "@/lib/chat";
import {
  calendarHintsForText,
  looksLikeCalendarHintText,
  shouldSuppressCalendarHints,
  type CalendarChatHint,
} from "@/lib/chat-calendar-hints";
import { calendarAnchor, DEMO_TIMEZONE, formatWhen } from "@/lib/clock";
import {
  demoAddReaction,
  demoCreatePost,
  demoPlaceCommerceOrder,
  demoReactions,
} from "@/lib/demo-client";
import { useHydrated } from "@/lib/use-hydrated";
import { looksLikeReminderText, suggestReminderFromText, type ReminderSuggestion } from "@/lib/remind-detect";
import { looksLikeScheduleText, suggestScheduleFromText } from "@/lib/schedule-detect";
import {
  checkInReplyDraft,
  detectCheckInSuggestion,
  looksLikeCheckInText,
  type CheckInSuggestion,
} from "@/lib/clinical/check-in";
import { looksLikeMutualAidText } from "@/lib/mutual-aid-detect";
import { isWeeklyFamilyCall } from "@/lib/family-call-schedule";
import type {
  CalendarEvent,
  CommerceSuggestion,
  Member,
  MutualAidSuggestion,
  Post,
  PostReaction,
} from "@/lib/types";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M6 1.5a3 3 0 0 0-3 3v2.5L2 8.5h8l-1-1.5V4.5a3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="1" />
      <path d="M5 9.5a1 1 0 0 0 2 0" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <rect x="1" y="2" width="10" height="9" rx="1" stroke="currentColor" strokeWidth="1" />
      <path d="M1 5h10M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function ReminderChip({
  suggestion,
  assigneeName,
  onAdd,
  busy,
  compact,
  easy,
}: {
  suggestion: ReminderSuggestion;
  assigneeName: string;
  onAdd: () => void;
  busy?: boolean;
  compact?: boolean;
  easy?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onAdd}
      className={`inline-flex max-w-full items-center gap-1 rounded-sm border border-rule bg-surface px-2 text-clinic hover:bg-accent-tint disabled:opacity-50 ${
        easy ? "min-h-11 py-2 text-sm" : "py-0.5 text-[11px]"
      } ${compact ? "mt-1" : ""}`}
    >
      <BellIcon className="shrink-0" />
      <span className="truncate">
        Add reminder for {assigneeName}
        <span className="text-mute"> · {suggestion.dueHint}</span>
      </span>
    </button>
  );
}

function CheckInChip({
  suggestion,
  authorName,
  onDraftReply,
  compact,
  easy,
}: {
  suggestion: CheckInSuggestion;
  authorName: string;
  onDraftReply: () => void;
  compact?: boolean;
  easy?: boolean;
}) {
  return (
    <div
      className={`rounded-sm border border-amber-200/80 bg-amber-50/80 px-2.5 py-2 text-amber-950 ${
        compact ? "mt-1" : "mx-3 mb-2"
      }`}
    >
      <p className={`font-medium ${easy ? "text-sm" : "text-[11px]"}`}>
        {suggestion.title}
        <span className="font-normal text-amber-900/80"> · {suggestion.label}</span>
      </p>
      <p className={`mt-1 leading-snug text-amber-950/85 ${easy ? "text-sm" : "text-[11px]"}`}>
        {suggestion.message}
      </p>
      <button
        type="button"
        onClick={onDraftReply}
        className={`mt-2 font-medium text-clinic hover:underline ${easy ? "min-h-10 text-sm" : "text-[11px]"}`}
      >
        Draft a reply to {authorName}
      </button>
    </div>
  );
}

function PinnedEventCard({
  post,
  event,
  authorName,
  timeZone,
  hour12,
  easy,
  familyId,
  meId,
  members,
  onAdded,
  onClaimSupply,
  onOrderSupply,
  supplyBusyId,
  orderingSupplyId,
  orderedBySupplyId,
  demo = false,
}: {
  post: Post;
  event?: CalendarEvent;
  authorName: string;
  timeZone: string;
  hour12: boolean;
  easy?: boolean;
  familyId: string;
  meId: string;
  members?: Member[];
  onAdded?: () => void;
  onClaimSupply?: (event: CalendarEvent, supplyId: string) => void;
  onOrderSupply?: (suggestion: CommerceSuggestion) => void;
  supplyBusyId?: string | null;
  orderingSupplyId?: string | null;
  orderedBySupplyId?: Record<string, { message: string }>;
  demo?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addToMyCalendar() {
    if (!event || busy || added) return;
    setBusy(true);
    setError(null);
    if (demo) {
      setAdded(true);
      setBusy(false);
      onAdded?.();
      return;
    }
    const res = await fetch("/api/events", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: event.id, familyId, memberId: meId }),
    });
    setBusy(false);
    if (res.ok) {
      setAdded(true);
      onAdded?.();
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Could not add to your calendar.");
    }
  }

  const title = event?.title ?? post.body.replace(/^📅\s*/, "");
  const when = event ? formatWhen(event.startsAt, { timeZone, hour12 }) : null;

  return (
    <div className="flex justify-center">
      <div
        className={`w-full max-w-sm rounded-md border border-ember/25 bg-accent-tint/40 px-4 py-3 ${
          easy ? "text-base" : "text-sm"
        }`}
      >
        <div className="flex items-start gap-2">
          <CalendarIcon className="mt-0.5 shrink-0 text-ember" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-mute">
              Pinned to calendar · {authorName}
            </p>
            <p className="mt-0.5 font-semibold text-ink">{title}</p>
            {when ? <p className="text-mute">{when}</p> : null}
            {event?.location ? <p className="truncate text-mute">{event.location}</p> : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {event ? (
                added ? (
                  <span className="text-xs font-medium text-clinic">Added to your calendar ✓</span>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={addToMyCalendar}
                    className={`rounded-sm border border-ember/30 bg-surface font-semibold text-ember hover:bg-ember/5 disabled:opacity-50 ${
                      easy ? "min-h-10 px-3 text-sm" : "px-2.5 py-1 text-xs"
                    }`}
                  >
                    {busy ? "Adding…" : "Add to My Calendar"}
                  </button>
                )
              ) : null}
              <Link
                href="/family/calendar"
                className={`font-medium text-clinic hover:underline ${easy ? "text-sm" : "text-xs"}`}
              >
                View calendar
              </Link>
            </div>
            {error ? <p className="mt-1 text-xs text-ember">{error}</p> : null}
            {event && members && onClaimSupply && onOrderSupply && canClaimSupplies(event) && (event.supplies?.length ?? 0) > 0 ? (
              <EventBringList
                event={ensureEventSupplies(event)}
                members={members}
                meId={meId}
                busySupplyId={supplyBusyId}
                orderingSupplyId={orderingSupplyId}
                onClaim={(supplyId) => onClaimSupply(event, supplyId)}
                onOrder={onOrderSupply}
                orderedBySupplyId={orderedBySupplyId}
                compact
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function BringListCard({
  event,
  members,
  meId,
  busySupplyId,
  orderingSupplyId,
  onClaim,
  onOrder,
  matchedItem,
  orderedBySupplyId,
}: {
  event: CalendarEvent;
  members: Member[];
  meId: string;
  busySupplyId?: string | null;
  orderingSupplyId?: string | null;
  onClaim: (supplyId: string) => void;
  onOrder: (suggestion: CommerceSuggestion) => void;
  matchedItem?: { item: string; id: string };
  orderedBySupplyId?: Record<string, { message: string }>;
}) {
  return (
    <div className="mt-2 w-full max-w-sm rounded-md border border-ember/25 bg-surface px-3 py-2.5">
      {matchedItem ? (
        <p className="text-xs text-mute">
          Tap <span className="font-medium text-ink">Claim</span> to bring {matchedItem.item.toLowerCase()}
        </p>
      ) : null}
      <EventBringList
        event={event}
        members={members}
        meId={meId}
        busySupplyId={busySupplyId}
        orderingSupplyId={orderingSupplyId}
        onClaim={onClaim}
        onOrder={onOrder}
        orderedBySupplyId={orderedBySupplyId}
        compact
      />
    </div>
  );
}

function CalendarHintChips({
  hints,
  compact,
  timeZone,
  hour12,
  easy,
}: {
  hints: CalendarChatHint[];
  compact?: boolean;
  timeZone: string;
  hour12: boolean;
  easy?: boolean;
}) {
  if (!hints.length) return null;
  return (
    <div className={`flex flex-wrap gap-1 ${compact ? "mt-1" : ""}`}>
      {hints.map((h) => (
        <Link
          key={h.event.id}
          href="/family/calendar"
          className={`inline-flex max-w-full items-center gap-1 rounded-sm border border-rule bg-surface px-2 text-clinic hover:underline ${
            easy ? "min-h-11 py-2 text-sm" : "py-0.5 text-[11px]"
          }`}
        >
          <CalendarIcon className="shrink-0" />
          <span className="truncate">
            On the calendar: {h.label}
            <span className="text-mute"> · {formatWhen(h.event.startsAt, { timeZone, hour12 })}</span>
            {h.clues?.length ? <span className="text-mute"> · {h.clues.slice(0, 2).join(", ")}</span> : null}
          </span>
        </Link>
      ))}
    </div>
  );
}

function Avatar({ member, size = 40 }: { member?: Member; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
      style={{ width: size, height: size, background: member?.color ?? "#8696a0" }}
    >
      {member?.initials ?? "?"}
    </span>
  );
}

const QUICK_REACTIONS = ["❤️", "👍", "😂"];

function MessageReactions({
  postId,
  familyId,
  meId,
  reactions,
  onReact,
}: {
  postId: string;
  familyId: string;
  meId: string;
  reactions: PostReaction[];
  onReact: (postId: string, emoji: string) => void;
}) {
  const grouped = QUICK_REACTIONS.map((emoji) => ({
    emoji,
    count: reactions.filter((r) => r.postId === postId && r.emoji === emoji).length,
    mine: reactions.some((r) => r.postId === postId && r.emoji === emoji && r.memberId === meId),
  })).filter((g) => g.count > 0 || QUICK_REACTIONS.includes(g.emoji));

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {grouped.map((g) =>
        g.count > 0 ? (
          <span
            key={g.emoji}
            className={`rounded-sm border px-1.5 py-0.5 text-[11px] ${g.mine ? "border-ember/40 bg-accent-tint" : "border-rule bg-surface"}`}
          >
            {g.emoji} {g.count}
          </span>
        ) : null,
      )}
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onReact(postId, emoji)}
          className="rounded-sm border border-transparent px-1 py-0.5 text-[11px] text-mute hover:border-rule hover:bg-surface"
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export function ChatApp({
  posts,
  members,
  familyName,
  inviteCode,
  events = [],
  demo = false,
  initialWith,
  initialDraft,
  initialInvite,
  assistantContext,
}: {
  posts: Post[];
  members: Member[];
  familyName: string;
  inviteCode?: string;
  events?: CalendarEvent[];
  demo?: boolean;
  initialWith?: string;
  initialDraft?: string;
  initialInvite?: boolean;
  assistantContext: Omit<AssistantContext, "postingAs" | "path">;
}) {
  const { me, setMeId } = useFamily();
  const easy = useLargerText();
  const timeZone = useTimezone();
  const hour12 = useHour12();
  const hydrated = useHydrated();
  const chatTimeZone = demo ? DEMO_TIMEZONE : timeZone;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [urlReady, setUrlReady] = useState(false);
  const withParam = urlReady
    ? (searchParams.get("with") ?? initialWith ?? GROUP_THREAD)
    : (initialWith ?? GROUP_THREAD);
  const threadId =
    withParam === ASSISTANT_THREAD
      ? ASSISTANT_THREAD
      : withParam === GROUP_THREAD
        ? GROUP_THREAD
        : threadForDm(me.id, withParam);
  const assistantActive = isAssistantThread(threadId);
  const [body, setBody] = useState(initialDraft ?? "");
  const [kind, setKind] = useState<"text" | "voice" | "photo" | "status">("text");
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(
    () => !initialWith || initialWith === GROUP_THREAD || initialWith === ASSISTANT_THREAD,
  );
  const [showAddMember, setShowAddMember] = useState(() => Boolean(initialInvite));
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [scheduleHint, setScheduleHint] = useState<{
    title: string;
    suggestedText: string;
    reason: string;
    weeklyFamilyCall?: boolean;
  } | null>(null);
  const [calendarAdded, setCalendarAdded] = useState<{ title: string; when: string; count?: number } | null>(
    null,
  );
  const [reminderHint, setReminderHint] = useState<ReminderSuggestion | null>(null);
  const [reminderAdded, setReminderAdded] = useState<{ text: string; who: string; when: string } | null>(null);
  const [mutualAidHint, setMutualAidHint] = useState<MutualAidSuggestion | null>(null);
  const [commerceHint, setCommerceHint] = useState<CommerceSuggestion | null>(null);
  const [commerceOrders, setCommerceOrders] = useState<Record<string, { message: string }>>({});
  const [orderingCommerce, setOrderingCommerce] = useState(false);
  const [addingReminder, setAddingReminder] = useState(false);
  const [supplyBusyId, setSupplyBusyId] = useState<string | null>(null);
  const [orderingSupplyId, setOrderingSupplyId] = useState<string | null>(null);
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>(() => events.map(ensureEventSupplies));
  const [localPosts, setLocalPosts] = useState<Post[]>(posts);
  const [reactions, setReactions] = useState<PostReaction[]>([]);
  const chatPosts = demo ? localPosts : posts;
  const [assistantPreview, setAssistantPreview] = useState(() => assistantPreviewText());
  const hasWeeklyCalls = localEvents.some(isWeeklyFamilyCall);
  const messagesRef = useRef<HTMLDivElement>(null);
  const composingRef = useRef(false);
  const byId = Object.fromEntries(members.map((m) => [m.id, m]));
  const deferredBody = useDeferredValue(body);
  composingRef.current = body.trim().length > 0;

  useEffect(() => {
    setLocalEvents(events.map(ensureEventSupplies));
  }, [events]);

  useEffect(() => {
    if (!demo) setLocalPosts(posts);
  }, [demo, posts]);

  useEffect(() => {
    setUrlReady(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setAssistantPreview(assistantPreviewText());
    const onPreview = () => setAssistantPreview(assistantPreviewText());
    window.addEventListener("hearth-assistant-preview", onPreview);
    return () => window.removeEventListener("hearth-assistant-preview", onPreview);
  }, [hydrated]);

  useEffect(() => {
    const draft = searchParams.get("draft") ?? initialDraft;
    if (draft) setBody(draft);
  }, [searchParams, initialDraft]);

  useEffect(() => {
    if (!urlReady) return;
    if (searchParams.get("invite") === "1" || initialInvite) setShowAddMember(true);
  }, [searchParams, initialInvite, urlReady]);

  const chatAnchor = useMemo(() => calendarAnchor(demo), [demo]);
  const hintOpts = useMemo(
    () => ({ anchor: chatAnchor, timeZone: chatTimeZone }),
    [chatAnchor, chatTimeZone],
  );

  useEffect(() => {
    if (demo) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible" || composingRef.current) return;
      router.refresh();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [demo, router]);

  useEffect(() => {
    if (demo) return;
    fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ familyId: me.familyId, memberId: me.id }),
    }).catch(() => {});
  }, [demo, me.familyId, me.id]);

  useEffect(() => {
    if (demo) {
      setReactions(demoReactions(me.familyId));
      return;
    }
    let cancelled = false;
    fetch(`/api/reactions?familyId=${encodeURIComponent(me.familyId)}&memberId=${encodeURIComponent(me.id)}`)
      .then((r) => r.json())
      .then((data: { reactions?: PostReaction[] }) => {
        if (!cancelled) setReactions(data.reactions ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [demo, me.familyId, me.id, chatPosts.length]);

  async function reactToPost(postId: string, emoji: string) {
    if (demo) {
      const reaction = demoAddReaction({ familyId: me.familyId, memberId: me.id, postId, emoji });
      setReactions((prev) => {
        const exists = prev.some(
          (r) => r.postId === reaction.postId && r.memberId === reaction.memberId && r.emoji === reaction.emoji,
        );
        return exists ? prev : [...prev, reaction];
      });
      return;
    }
    const res = await fetch("/api/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ familyId: me.familyId, memberId: me.id, postId, emoji }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { reaction?: PostReaction };
    if (data.reaction) {
      setReactions((prev) => {
        const exists = prev.some(
          (r) =>
            r.postId === data.reaction!.postId &&
            r.memberId === data.reaction!.memberId &&
            r.emoji === data.reaction!.emoji,
        );
        return exists ? prev : [...prev, data.reaction!];
      });
    }
    router.refresh();
  }

  const threads = useMemo(
    () => buildChatThreads(chatPosts, members, me.id, familyName, chatTimeZone, threadId),
    [chatPosts, members, me.id, familyName, chatTimeZone, threadId],
  );

  const messageableMembers = useMemo(
    () => members.filter((m) => m.id !== me.id).sort((a, b) => a.name.localeCompare(b.name)),
    [members, me.id],
  );

  const messages = useMemo(
    () =>
      chatPosts
        .filter((p) => postThreadId(p) === threadId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [chatPosts, threadId],
  );

  const lastThreadText = messages.length
    ? messages[messages.length - 1].transcript || messages[messages.length - 1].body
    : "";
  const draftSchedule = useMemo(() => {
    if (!deferredBody.trim() || !looksLikeScheduleText(deferredBody)) return null;
    return suggestScheduleFromText(deferredBody, members, localEvents, {
      familyId: me.familyId,
      createdBy: me.id,
      anchor: chatAnchor,
    });
  }, [deferredBody, members, localEvents, me.familyId, me.id, chatAnchor]);
  const draftHints = useMemo(() => {
    if (!hydrated || !deferredBody.trim() || draftSchedule || shouldSuppressCalendarHints(deferredBody)) return [];
    if (!looksLikeCalendarHintText(deferredBody) && !looksLikeCalendarHintText(lastThreadText)) return [];
    return calendarHintsForText(deferredBody, localEvents, lastThreadText, hintOpts);
  }, [hydrated, deferredBody, localEvents, lastThreadText, draftSchedule, hintOpts]);
  const draftReminder = useMemo(() => {
    if (!deferredBody.trim() || !looksLikeReminderText(deferredBody)) return null;
    return suggestReminderFromText(deferredBody, members, me.id, chatAnchor);
  }, [deferredBody, members, me.id, chatAnchor]);
  const messageEnrichments = useMemo(() => {
    const enrichments = new Map<
      string,
      {
        scheduleProposal: ReturnType<typeof suggestScheduleFromText>;
        reminderProposal: ReminderSuggestion | null;
        mutualAidProposal: MutualAidSuggestion | null;
        commerceProposal: CommerceSuggestion | null;
        bringListHint: BringListHint | null;
        bringEvent: CalendarEvent | null;
        checkInProposal: CheckInSuggestion | null;
        assigneeName: string;
        hints: CalendarChatHint[];
      }
    >();
    const start = Math.max(0, messages.length - 16);
    for (let i = start; i < messages.length; i++) {
      const p = messages[i];
      if (p.kind === "event_pin") continue;
      const text = p.transcript || p.body;
      const prior = i > 0 ? messages[i - 1].transcript || messages[i - 1].body : "";
      const scheduleProposal = looksLikeScheduleText(text)
        ? suggestScheduleFromText(text, members, localEvents, {
            familyId: me.familyId,
            createdBy: p.authorId,
            anchor: chatAnchor,
          })
        : null;
      const reminderProposal = looksLikeReminderText(text)
        ? suggestReminderFromText(text, members, p.authorId, chatAnchor)
        : null;
      const mutualAidProposal = looksLikeMutualAidText(text)
        ? suggestMutualAidFromText(text, members, p.authorId)
        : null;
      const bringListHint = looksLikeBringListText(text)
        ? suggestBringListFromText(text, localEvents, members, p.authorId, prior)
        : null;
      const commerceProposal = looksLikeCommerceText(text)
        ? suggestCommerceFromText(text, members, p.authorId, {
            events: localEvents,
            priorMessage: prior,
            bringHint: bringListHint,
          })
        : null;
      const bringEvent = bringListHint ? ensureEventSupplies(bringListHint.event) : null;
      const hints =
        hydrated &&
        !scheduleProposal &&
        !shouldSuppressCalendarHints(text) &&
        looksLikeCalendarHintText(text)
          ? calendarHintsForText(text, localEvents, prior, hintOpts)
          : [];
      const checkInProposal =
        p.authorId !== me.id && looksLikeCheckInText(text) ? detectCheckInSuggestion(text) : null;
      if (
        !scheduleProposal &&
        !reminderProposal &&
        !mutualAidProposal &&
        !commerceProposal &&
        !bringListHint &&
        !checkInProposal &&
        !hints.length
      ) {
        continue;
      }
      enrichments.set(p.id, {
        scheduleProposal,
        reminderProposal,
        mutualAidProposal,
        commerceProposal,
        bringListHint,
        bringEvent,
        checkInProposal,
        assigneeName:
          members.find((m) => m.id === reminderProposal?.assigneeId)?.name.split(" ")[0] ?? "",
        hints,
      });
    }
    return enrichments;
  }, [messages, members, localEvents, me.familyId, me.id, chatAnchor, hydrated, hintOpts]);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages.length, threadId]);

  const headerTitle = assistantActive ? ASSISTANT_LABEL : threadLabel(threadId, me.id, members, familyName);
  const headerMember =
    assistantActive || isGroupThread(threadId) ? undefined : members.find((m) => m.id === withParam);

  function openThread(key: string) {
    const q = key === GROUP_THREAD ? "" : `?with=${key}`;
    router.push(`/family${q}`);
    setMobileShowChat(true);
    setShowNewMessage(false);
  }

  function startVoice() {
    const w = window as Window & {
      SpeechRecognition?: new () => BrowserRec;
      webkitSpeechRecognition?: new () => BrowserRec;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setVoiceError("Voice is not available in this browser. Type your message instead.");
      return;
    }
    setVoiceError(null);
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.onresult = (ev) => {
      setBody(Array.from(ev.results).map((r) => r[0].transcript).join(" "));
      setKind("voice");
    };
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  }

  function onPhoto(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(String(reader.result));
      setKind("photo");
    };
    reader.readAsDataURL(file);
  }

  async function createReminder(suggestion: ReminderSuggestion, sourcePostId?: string) {
    setAddingReminder(true);
    const assignee = members.find((m) => m.id === suggestion.assigneeId);
    if (demo) {
      setReminderAdded({
        text: suggestion.text,
        who: assignee?.name.split(" ")[0] ?? "someone",
        when: suggestion.dueHint,
      });
      setReminderHint(null);
      setAddingReminder(false);
      return;
    }
    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familyId: me.familyId,
        authorId: me.id,
        assigneeId: suggestion.assigneeId,
        text: suggestion.text,
        dueAt: suggestion.dueAt,
        dueHint: suggestion.dueHint,
        sourceText: suggestion.sourceText,
        sourcePostId,
      }),
    });
    setAddingReminder(false);
    if (res.ok) {
      setReminderAdded({
        text: suggestion.text,
        who: assignee?.name.split(" ")[0] ?? "someone",
        when: suggestion.dueHint,
      });
      setReminderHint(null);
      router.refresh();
    }
  }

  async function placeCommerceOrder(suggestion: CommerceSuggestion, sourcePostId?: string) {
    setOrderingCommerce(true);
    if (demo) {
      const recipient = members.find((m) => m.id === suggestion.recipientId);
      const data = demoPlaceCommerceOrder({
        recipientName: recipient?.name.split(" ")[0] ?? "family",
        title: suggestion.title,
        kind: suggestion.kind,
        location: recipient?.location,
        street: recipient?.street,
        city: recipient?.city,
        state: recipient?.state,
      });
      const key = sourcePostId ?? suggestion.supplyId ?? "draft";
      setCommerceOrders((prev) => ({ ...prev, [key]: { message: data.message } }));
      setCommerceHint(null);
      setOrderingCommerce(false);
      return;
    }
    const res = await fetch("/api/commerce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familyId: me.familyId,
        authorId: me.id,
        recipientId: suggestion.recipientId,
        kind: suggestion.kind,
        title: suggestion.title,
        sourceText: suggestion.sourceText,
        sourcePostId,
      }),
    });
    setOrderingCommerce(false);
    if (res.ok) {
      const data = (await res.json()) as { message?: string };
      const key = sourcePostId ?? suggestion.supplyId ?? "draft";
      setCommerceOrders((prev) => ({ ...prev, [key]: { message: data.message ?? "Order placed." } }));
      setCommerceHint(null);
    }
  }

  async function claimSupply(event: CalendarEvent, supplyId: string) {
    if (supplyBusyId || !canClaimSupplies(event)) return;
    const supplies = nextSupplyClaim(event, supplyId, me.id);
    const previous = localEvents;
    setSupplyBusyId(supplyId);
    setLocalEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, supplies } : e)));
    if (demo) {
      setSupplyBusyId(null);
      return;
    }
    try {
      const res = await fetch("/api/events", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: event.id,
          familyId: event.familyId,
          memberId: me.id,
          supplyId,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as CalendarEvent & { error?: string };
      if (!res.ok) throw new Error(data.error || "Couldn't update bring list.");
      setLocalEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, ...data } : e)));
    } catch {
      setLocalEvents(previous);
    } finally {
      setSupplyBusyId(null);
    }
  }

  async function orderSupplyFromBringList(suggestion: CommerceSuggestion) {
    setOrderingSupplyId(suggestion.supplyId ?? null);
    await placeCommerceOrder(suggestion);
    setOrderingSupplyId(null);
  }

  async function forwardMutualAid(suggestion: MutualAidSuggestion, groupId: string, groupName: string) {
    if (demo) return;
    await fetch("/api/mutual-aid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familyId: me.familyId,
        authorId: me.id,
        requesterId: suggestion.requesterId,
        task: suggestion.task,
        sourceText: suggestion.sourceText,
        sourcePostId: suggestion.sourcePostId,
        groupId,
        groupName,
      }),
    });
  }

  function applyDemoPost(body: string) {
    const result = demoCreatePost({
      familyId: me.familyId,
      authorId: me.id,
      threadId,
      kind,
      body,
      photoUrl,
      transcript: kind === "voice" ? body : undefined,
      voiceSeconds: kind === "voice" ? Math.max(4, Math.round(body.split(" ").length / 2)) : undefined,
      posts: localPosts,
      members,
      events: localEvents,
    });
    setLocalPosts((prev) => [result.post, ...prev]);
    setScheduleHint(result.scheduleSuggestion ?? null);
    setReminderHint(result.reminderSuggestion ?? null);
    if (result.mutualAidSuggestion) {
      setMutualAidHint({ ...result.mutualAidSuggestion, sourcePostId: result.post.id });
    }
    if (result.commerceSuggestion) {
      setCommerceHint({ ...result.commerceSuggestion, sourcePostId: result.post.id });
    }
    setBody("");
    setPhotoUrl(undefined);
    setKind("text");
  }

  async function send() {
    const text = body.trim();
    if (!text && !photoUrl) return;
    if (demo) {
      applyDemoPost(text || (kind === "photo" ? "Photo" : "Voice note"));
      return;
    }
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familyId: me.familyId,
        authorId: me.id,
        threadId,
        kind,
        body: text || (kind === "photo" ? "Photo" : "Voice note"),
        photoUrl,
        transcript: kind === "voice" ? text : undefined,
        voiceSeconds: kind === "voice" ? Math.max(4, Math.round(text.split(" ").length / 2)) : undefined,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      scheduleSuggestion?: { title: string; suggestedText: string; reason: string; weeklyFamilyCall?: boolean };
      reminderSuggestion?: ReminderSuggestion;
      mutualAidSuggestion?: MutualAidSuggestion;
      commerceSuggestion?: CommerceSuggestion;
      calendarEvent?: CalendarEvent;
      calendarEvents?: CalendarEvent[];
      id?: string;
    };
    setScheduleHint(data.scheduleSuggestion ?? null);
    setReminderHint(data.reminderSuggestion ?? null);
    if (data.mutualAidSuggestion) {
      setMutualAidHint({ ...data.mutualAidSuggestion, sourcePostId: data.id });
    }
    if (data.commerceSuggestion) {
      setCommerceHint({ ...data.commerceSuggestion, sourcePostId: data.id });
    }
    if (data.calendarEvent) {
      setCalendarAdded({
        title: data.calendarEvent.title,
        when: formatWhen(data.calendarEvent.startsAt, { timeZone: chatTimeZone, hour12 }),
        count: data.calendarEvents?.length,
      });
    } else {
      setCalendarAdded(null);
    }
    setBody("");
    setPhotoUrl(undefined);
    setKind("text");
    router.refresh();
  }

  function speak(text: string) {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.92;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  return (
    <div className="chat-surface grid h-full min-h-0 overflow-hidden md:grid-cols-[20rem_minmax(0,1fr)]">
      {/* Thread list - left column on desktop */}
      <aside
        className={`min-h-0 flex-col border-r border-rule bg-surface ${
          mobileShowChat ? "hidden" : "flex"
        } md:flex`}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-rule px-4 py-3">
          <h1 className="text-lg font-bold">Messages</h1>
          <button
            type="button"
            onClick={() => setShowNewMessage(true)}
            className="min-h-10 shrink-0 rounded-sm px-2 text-sm font-semibold text-ember hover:bg-accent-tint"
            aria-label="Start a direct message"
          >
            + Message
          </button>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <li className="sticky top-0 z-10 border-b border-rule bg-surface">
            <button
              type="button"
              onClick={() => openThread(ASSISTANT_THREAD)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent-tint ${
                assistantActive ? "bg-accent-tint" : ""
              }`}
              aria-current={assistantActive ? "true" : undefined}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-tint ring-2 ring-ember/25">
                <FamilyrMark className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate font-medium text-ink">{ASSISTANT_LABEL}</p>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-ember">Pinned</span>
                </div>
                <p className="truncate text-sm text-mute">{assistantPreview}</p>
              </div>
            </button>
          </li>
          {threads.length === 0 ? (
            <li className="px-4 py-6 text-sm text-mute">No conversations yet.</li>
          ) : null}
          {threads.map((t) => {
            const active = threadId === t.id;
            const param = t.key === GROUP_THREAD ? GROUP_THREAD : t.key;
            const isActive =
              active ||
              (param === GROUP_THREAD && withParam === GROUP_THREAD) ||
              (param !== GROUP_THREAD && withParam === param);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => openThread(t.key)}
                  className={`flex w-full items-center gap-3 border-b border-rule px-4 py-3 text-left hover:bg-accent-tint ${
                    isActive ? "bg-accent-tint" : ""
                  }`}
                >
                  {t.isGroup ? (
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-ember text-sm font-semibold text-white">
                      {familyInitials(familyName)}
                    </span>
                  ) : (
                    <Avatar member={t.avatar} size={40} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate font-medium">{t.label}</p>
                      {t.time ? <span className="shrink-0 text-xs text-mute">{t.time}</span> : null}
                    </div>
                    <p className="truncate text-sm text-mute">{t.preview || "No messages yet"}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Conversation - right column on desktop */}
      <div className={`flex min-h-0 min-w-0 flex-col overflow-hidden ${mobileShowChat ? "flex" : "hidden md:flex"}`}>
        <div className="shrink-0 border-b border-rule bg-surface px-4 py-2.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-sm text-accent md:hidden"
              onClick={() => setMobileShowChat(false)}
            >
              ← Back
            </button>
            {assistantActive ? (
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-tint">
                <FamilyrMark className="h-6 w-6" />
              </span>
            ) : headerMember ? (
              <Avatar member={headerMember} size={36} />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{headerTitle}</p>
              {assistantActive ? (
                <p className="text-xs text-mute">In-app help. Not Hestia.</p>
              ) : isGroupThread(threadId) ? (
                <p className="text-xs text-mute">{familyName} · {members.length} in circle</p>
              ) : (
                <p className="text-xs text-mute">{headerMember?.role ?? "Direct message"}</p>
              )}
            </div>
            {!assistantActive && isGroupThread(threadId) ? (
              <button
                type="button"
                onClick={() => setShowAddMember(true)}
                className={`shrink-0 rounded-sm border border-ember/30 bg-ember/5 font-semibold text-ember hover:bg-ember/10 ${
                  easy ? "min-h-11 px-3 text-sm" : "min-h-10 px-2.5 text-xs"
                }`}
              >
                Invite
              </button>
            ) : null}
          </div>
        </div>

        {assistantActive ? (
          <FamilyrAssistantChat
            context={{ ...assistantContext, postingAs: me.name }}
            easy={easy}
            demo={demo}
          />
        ) : (
        <div
          ref={messagesRef}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-transparent px-4 py-4"
        >
          {messages.map((p) => {
            const mine = p.authorId === me.id;
            const author = byId[p.authorId];
            if (p.kind === "event_pin") {
              const linked = localEvents.find((e) => e.id === p.linkedEventId);
              return (
                <PinnedEventCard
                  key={p.id}
                  post={p}
                  event={linked}
                  authorName={author?.name.split(" ")[0] ?? "Someone"}
                  timeZone={chatTimeZone}
                  hour12={hour12}
                  easy={easy}
                  familyId={me.familyId}
                  meId={me.id}
                  members={members}
                  onClaimSupply={(event, supplyId) => void claimSupply(event, supplyId)}
                  onOrderSupply={(suggestion) => void orderSupplyFromBringList(suggestion)}
                  supplyBusyId={supplyBusyId}
                  orderingSupplyId={orderingSupplyId}
                  orderedBySupplyId={commerceOrders}
                  demo={demo}
                />
              );
            }
            const text = p.transcript || p.body;
            const enrichment = messageEnrichments.get(p.id);
            const scheduleProposal = enrichment?.scheduleProposal ?? null;
            const reminderProposal = enrichment?.reminderProposal ?? null;
            const mutualAidProposal = enrichment?.mutualAidProposal ?? null;
            const commerceProposal = enrichment?.commerceProposal ?? null;
            const bringListHint = enrichment?.bringListHint ?? null;
            const bringEvent = enrichment?.bringEvent ?? null;
            const assigneeName = enrichment?.assigneeName ?? "";
            const hints = enrichment?.hints ?? [];
            const checkInProposal = enrichment?.checkInProposal ?? null;
            const authorFirstName = author?.name.split(" ")[0] ?? "them";
            const bringListCard =
              bringEvent && canClaimSupplies(bringEvent) && (bringEvent.supplies?.length ?? 0) > 0 ? (
                <BringListCard
                  event={bringEvent}
                  members={members}
                  meId={me.id}
                  busySupplyId={supplyBusyId}
                  orderingSupplyId={orderingSupplyId}
                  orderedBySupplyId={commerceOrders}
                  matchedItem={bringListHint?.matchedItem}
                  onClaim={(supplyId) => void claimSupply(bringEvent, supplyId)}
                  onOrder={(suggestion) => void orderSupplyFromBringList(suggestion)}
                />
              ) : null;

            if (mine) {
              return (
                <div key={p.id} className="flex items-end justify-end gap-2">
                  <div className="flex max-w-[75%] flex-col items-end">
                    <p className="mb-0.5 text-xs text-mute">
                      {author?.name} · {formatChatTime(p.createdAt, chatTimeZone, hour12)}
                    </p>
                    <div className="rounded-md bg-chat-out px-4 py-2.5">
                      {p.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.photoUrl} alt={p.photoAlt || ""} className="mb-1 max-h-48 rounded-sm object-cover" />
                      ) : null}
                      {p.kind === "voice" ? (
                        <button
                          type="button"
                          onClick={() => speak(`${author?.name}. ${text}`)}
                          className="flex items-center gap-2 text-sm font-medium text-ember hover:underline"
                        >
                          ▶ Voice {p.voiceSeconds ? `(${p.voiceSeconds}s)` : ""}
                        </button>
                      ) : (
                        <p className={`whitespace-pre-wrap leading-relaxed ${easy ? "text-base" : "text-[15px]"}`}>
                          {text}
                        </p>
                      )}
                    </div>
                    <MessageReactions
                      postId={p.id}
                      familyId={me.familyId}
                      meId={me.id}
                      reactions={reactions}
                      onReact={reactToPost}
                    />
                    <CalendarHintChips hints={hints} compact timeZone={chatTimeZone} hour12={hour12} easy={easy} />
                    {reminderProposal && assigneeName ? (
                      <ReminderChip
                        suggestion={reminderProposal}
                        assigneeName={assigneeName}
                        onAdd={() => createReminder(reminderProposal, p.id)}
                        busy={addingReminder}
                        compact
                        easy={easy}
                      />
                    ) : null}
                    {scheduleProposal ? (
                      <p className={`mt-1 text-right text-clinic ${easy ? "text-sm" : "text-[11px]"}`}>
                        {scheduleProposal.weeklyFamilyCall
                          ? `Reply “sure” to ${hasWeeklyCalls ? "reschedule" : "schedule"} weekly family calls on the calendar`
                          : "Reply “sure” to put this on the family calendar"}
                      </p>
                    ) : null}
                    {!mine && mutualAidProposal ? (
                      <MutualAidChip
                        suggestion={{ ...mutualAidProposal, sourcePostId: p.id }}
                        onForward={(groupId, groupName) =>
                          forwardMutualAid({ ...mutualAidProposal, sourcePostId: p.id }, groupId, groupName).then(() =>
                            setMutualAidHint(null),
                          )
                        }
                        compact
                      />
                    ) : null}
                    {commerceProposal ? (
                      <CommerceCard
                        suggestion={{ ...commerceProposal, sourcePostId: p.id }}
                        onOrder={() => placeCommerceOrder({ ...commerceProposal, sourcePostId: p.id }, p.id)}
                        busy={orderingCommerce}
                        compact
                        ordered={commerceOrders[p.id]}
                      />
                    ) : null}
                    {bringListCard}
                  </div>
                  <Avatar member={author} size={32} />
                </div>
              );
            }

            return (
              <div key={p.id} className="flex justify-start gap-2">
                <Avatar member={author} size={32} />
                <div className="max-w-[85%]">
                  <p className="mb-0.5 text-xs text-mute">
                    {author?.name} · {formatChatTime(p.createdAt, chatTimeZone, hour12)}
                  </p>
                  <div className="rounded-md border border-rule bg-chat-in px-4 py-2.5">
                    {p.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photoUrl} alt={p.photoAlt || ""} className="mb-1 max-h-48 rounded-sm object-cover" />
                    ) : null}
                    {p.kind === "voice" ? (
                      <button
                        type="button"
                        onClick={() => speak(`${author?.name}. ${text}`)}
                        className="flex items-center gap-2 text-sm font-medium text-ember hover:underline"
                      >
                        ▶ Voice {p.voiceSeconds ? `(${p.voiceSeconds}s)` : ""}
                      </button>
                    ) : (
                      <p className={`whitespace-pre-wrap leading-relaxed ${easy ? "text-base" : "text-[15px]"}`}>
                        {text}
                      </p>
                    )}
                  </div>
                  <MessageReactions
                    postId={p.id}
                    familyId={me.familyId}
                    meId={me.id}
                    reactions={reactions}
                    onReact={reactToPost}
                  />
                  <CalendarHintChips hints={hints} compact timeZone={chatTimeZone} hour12={hour12} easy={easy} />
                  {reminderProposal && assigneeName ? (
                    <ReminderChip
                      suggestion={reminderProposal}
                      assigneeName={assigneeName}
                      onAdd={() => createReminder(reminderProposal, p.id)}
                      busy={addingReminder}
                      compact
                      easy={easy}
                    />
                  ) : null}
                  {scheduleProposal ? (
                    <p className={`mt-1 text-clinic ${easy ? "text-sm" : "text-[11px]"}`}>
                      {scheduleProposal.weeklyFamilyCall
                        ? `Reply “sure” to ${hasWeeklyCalls ? "reschedule" : "schedule"} weekly family calls on the calendar`
                        : "Reply “sure” to put this on the family calendar"}
                    </p>
                  ) : null}
                  {mutualAidProposal ? (
                    <MutualAidChip
                      suggestion={{ ...mutualAidProposal, sourcePostId: p.id }}
                      onForward={(groupId, groupName) =>
                        forwardMutualAid({ ...mutualAidProposal, sourcePostId: p.id }, groupId, groupName)
                      }
                      compact
                    />
                  ) : null}
                  {checkInProposal ? (
                    <CheckInChip
                      suggestion={checkInProposal}
                      authorName={authorFirstName}
                      onDraftReply={() => setBody(checkInReplyDraft(authorFirstName, checkInProposal.concern))}
                      compact
                      easy={easy}
                    />
                  ) : null}
                  {commerceProposal ? (
                    <CommerceCard
                      suggestion={{ ...commerceProposal, sourcePostId: p.id }}
                      onOrder={() => placeCommerceOrder({ ...commerceProposal, sourcePostId: p.id }, p.id)}
                      busy={orderingCommerce}
                      compact
                      ordered={commerceOrders[p.id]}
                    />
                  ) : null}
                  {bringListCard}
                </div>
              </div>
            );
          })}
        </div>
        )}

        {!assistantActive ? (
        <div className="shrink-0">
        <SocialExtensions
          threadId={threadId}
          familyId={me.familyId}
          meId={me.id}
          meName={me.name}
          members={members}
          posts={chatPosts}
          messages={messages}
          body={body}
          setMeId={setMeId}
          mutualAidHint={mutualAidHint}
          setMutualAidHint={setMutualAidHint}
          commerceHint={commerceHint}
          setCommerceHint={setCommerceHint}
          onPlaceCommerceOrder={placeCommerceOrder}
          orderingCommerce={orderingCommerce}
          commerceOrders={commerceOrders}
          onRefresh={() => router.refresh()}
          onDemoPost={(emoji) => applyDemoPost(emoji)}
          demo={demo}
        />

        {reminderAdded ? (
          <div className="mx-3 mb-2 border border-rule bg-accent-tint px-3 py-2 text-sm">
            <p className="font-medium text-ink">
              Reminder for {reminderAdded.who}: {reminderAdded.text}
            </p>
            <p className="text-xs text-mute">{reminderAdded.when}</p>
            <div className="mt-1 flex gap-3">
              <Link href="/family/reminders" className="font-medium text-clinic hover:underline">
                View reminders
              </Link>
              <button type="button" onClick={() => setReminderAdded(null)} className="text-mute hover:text-ink">
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {reminderHint ? (
          <div className="mx-3 mb-2 border border-rule bg-surface px-3 py-2 text-sm">
            <p className="font-medium text-ink">
              Add reminder for {members.find((m) => m.id === reminderHint.assigneeId)?.name.split(" ")[0]}?
            </p>
            <p className="text-xs text-mute">
              {reminderHint.text} · {reminderHint.dueHint}
            </p>
            <div className="mt-1 flex gap-3">
              <button
                type="button"
                disabled={addingReminder}
                onClick={() => createReminder(reminderHint)}
                className="font-medium text-clinic hover:underline disabled:opacity-50"
              >
                Add reminder
              </button>
              <Link href="/family/reminders" className="text-mute hover:text-ink">
                Reminders tab
              </Link>
              <button type="button" onClick={() => setReminderHint(null)} className="text-mute hover:text-ink">
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {calendarAdded ? (
          <div className="mx-3 mb-2 border border-rule bg-accent-tint px-3 py-2 text-sm">
            <p className="font-medium text-ink">
              Added to calendar{calendarAdded.count && calendarAdded.count > 1 ? ` (${calendarAdded.count} events)` : ""}:{" "}
              {calendarAdded.title}
            </p>
            <p className="text-xs text-mute">{calendarAdded.when}</p>
            <div className="mt-1 flex gap-3">
              <Link href="/family/calendar" className="font-medium text-clinic hover:underline">
                View calendar
              </Link>
              <button type="button" onClick={() => setCalendarAdded(null)} className="text-mute hover:text-ink">
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {scheduleHint ? (
          <div className="mx-3 mb-2 border border-rule bg-surface px-3 py-2 text-sm">
            <p className="font-medium text-ink">Add to calendar? {scheduleHint.title}</p>
            <p className="text-xs text-mute">
              {scheduleHint.reason} Or have someone reply &ldquo;sure&rdquo; in the chat.
            </p>
            <div className="mt-1 flex gap-3">
              <a
                href={
                  scheduleHint.weeklyFamilyCall
                    ? "/family/calendar?autoCall=1"
                    : `/family/calendar?draft=${encodeURIComponent(scheduleHint.suggestedText)}`
                }
                className="font-medium text-clinic hover:underline"
              >
                {scheduleHint.weeklyFamilyCall
                  ? hasWeeklyCalls
                    ? "Reschedule weekly calls"
                    : "Schedule weekly calls"
                  : "Add to calendar"}
              </a>
              <button type="button" onClick={() => setScheduleHint(null)} className="text-mute hover:text-ink">
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {draftHints.length ? (
          <div className="mx-3 mb-2 border border-rule bg-surface px-3 py-2">
            <p className={`mb-1 font-medium text-mute ${easy ? "text-sm" : "text-[11px]"}`}>On the calendar</p>
            <CalendarHintChips hints={draftHints} timeZone={chatTimeZone} hour12={hour12} easy={easy} />
          </div>
        ) : null}

        {draftReminder && !draftSchedule ? (
          <div className="mx-3 mb-2 border border-rule bg-surface px-3 py-2">
            <p className={`mb-1 font-medium text-mute ${easy ? "text-sm" : "text-[11px]"}`}>Reminder suggestion</p>
            <ReminderChip
              suggestion={draftReminder}
              assigneeName={members.find((m) => m.id === draftReminder.assigneeId)?.name.split(" ")[0] ?? "someone"}
              onAdd={() => createReminder(draftReminder)}
              busy={addingReminder}
              easy={easy}
            />
          </div>
        ) : null}

        {photoUrl ? (
          <div className="px-3">
            <div className="inline-block border border-rule bg-surface p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="Preview" className="h-20 object-cover" />
            </div>
          </div>
        ) : null}

        {isGroupThread(threadId) ? (
          <ConversationStarters
            familyId={me.familyId}
            meId={me.id}
            postCount={chatPosts.length}
            setBody={setBody}
            demo={demo}
            easy={easy}
          />
        ) : null}

        <div className="border-t border-rule bg-surface px-3 py-2">
          {voiceError ? (
            <p className="mb-2 text-sm text-red-700" role="alert">{voiceError}</p>
          ) : null}
          <div className="flex items-end gap-2">
            <label className="cursor-pointer px-1 py-2 text-xs font-medium text-mute hover:text-ink">
              Photo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} />
            </label>
            <button
              type="button"
              onClick={startVoice}
              className={`px-1 py-2 text-xs font-medium ${listening ? "text-accent" : "text-mute hover:text-ink"}`}
            >
              Voice
            </button>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="say something…"
              rows={1}
              className={`max-h-28 min-h-[40px] flex-1 resize-none border border-rule bg-surface px-3 py-2 outline-none focus:border-accent ${
                easy ? "text-base" : "text-sm"
              }`}
            />
            <button
              type="button"
              onClick={send}
              className={`rounded-sm bg-ember px-4 font-medium text-white hover:bg-ember-dark ${easy ? "py-3 text-base" : "py-2 text-sm"}`}
            >
              Send
            </button>
          </div>
        </div>
        </div>
        ) : null}
      </div>

      {showNewMessage ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-message-title"
          onClick={() => setShowNewMessage(false)}
        >
          <div
            className="max-h-[min(28rem,80dvh)] w-full max-w-md overflow-hidden border border-rule bg-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-rule px-4 py-3">
              <h2 id="new-message-title" className="font-semibold text-ink">New message</h2>
              <button
                type="button"
                onClick={() => setShowNewMessage(false)}
                className="text-sm text-mute hover:text-ink"
              >
                Close
              </button>
            </div>
            <ul className="max-h-[min(22rem,65dvh)] overflow-y-auto">
              {messageableMembers.map((member) => (
                <li key={member.id}>
                  <button
                    type="button"
                    onClick={() => openThread(member.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent-tint"
                  >
                    <Avatar member={member} size={36} />
                    <div className="min-w-0 text-left">
                      <p className="truncate font-medium">{member.name}</p>
                      <p className="truncate text-xs text-mute">{member.role}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {showAddMember ? (
        <AddMemberPanel
          familyId={me.familyId}
          inviteCode={inviteCode}
          familyName={familyName}
          onClose={() => setShowAddMember(false)}
          onChanged={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}

type BrowserRec = {
  lang: string;
  interimResults: boolean;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
};
