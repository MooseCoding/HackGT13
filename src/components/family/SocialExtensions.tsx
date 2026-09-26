"use client";

import { META_MUSE_ATTRIBUTION } from "@/lib/ai/attribution";
import { CommerceCard } from "@/components/family/CommerceCard";
import { SocialDemoGuide } from "@/components/family/SocialDemoGuide";
import { GROUP_THREAD, isGroupThread } from "@/lib/chat";
import {
  demoAcknowledgeCheckIn,
  demoForwardMutualAid,
  demoSafeCheckIns,
} from "@/lib/demo-client";
import { demoLifeStoryPrompts } from "@/lib/social-demo";
import { suggestCommerceFromText, looksLikeCommerceText } from "@/lib/commerce-detect";
import { suggestMutualAidFromText, looksLikeMutualAidText } from "@/lib/mutual-aid-detect";
import type {
  CommerceSuggestion,
  LifeStoryPrompt,
  Member,
  MutualAidSuggestion,
  Post,
  SafeCheckInStatus,
} from "@/lib/types";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M7 12s-5-3.2-5-6.8C2 3.4 3.8 2 5.5 2c1 0 1.9.5 2.5 1.2C8.6 2.5 9.5 2 10.5 2 12.2 2 14 3.4 14 5.2 14 8.8 7 12 7 12z"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

function HandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M4 6V3.5a1 1 0 0 1 2 0V7M6 7V2.5a1 1 0 0 1 2 0V7M8 7V3.5a1 1 0 1 1 2 0V8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6.5a1 1 0 0 1 2 0V7"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M7 1v2M7 11v2M1 7h2M11 7h2M3 3l1.4 1.4M9.6 9.6 11 11M3 11l1.4-1.4M9.6 4.4 11 3" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function MutualAidChip({
  suggestion,
  onForward,
  busy,
  compact,
}: {
  suggestion: MutualAidSuggestion;
  onForward: (groupId: string, groupName: string) => void;
  busy?: boolean;
  compact?: boolean;
}) {
  const group = suggestion.groups[0];
  if (!group) return null;
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => onForward(group.id, group.name)}
      className={`inline-flex max-w-full items-center gap-1 rounded-sm border border-ember/30 bg-ember/5 px-2 py-0.5 text-[11px] text-ember hover:bg-ember/10 disabled:opacity-50 ${compact ? "mt-1" : ""}`}
    >
      <HandIcon className="shrink-0" />
      <span className="truncate">
        Forward local help request to {group.name}
      </span>
    </button>
  );
}

export function SocialExtensions({
  threadId,
  familyId,
  meId,
  meName,
  members,
  posts,
  messages,
  body,
  setBody,
  setMeId,
  mutualAidHint,
  setMutualAidHint,
  commerceHint,
  setCommerceHint,
  onPlaceCommerceOrder,
  orderingCommerce = false,
  commerceOrders = {},
  onRefresh,
  onDemoPost,
  demo = false,
}: {
  threadId: string;
  familyId: string;
  meId: string;
  meName: string;
  members: Member[];
  posts: Post[];
  messages: Post[];
  body: string;
  setBody: (v: string) => void;
  setMeId: (id: string) => void;
  mutualAidHint: MutualAidSuggestion | null;
  setMutualAidHint: (v: MutualAidSuggestion | null) => void;
  commerceHint: CommerceSuggestion | null;
  setCommerceHint: (v: CommerceSuggestion | null) => void;
  onPlaceCommerceOrder: (suggestion: CommerceSuggestion, sourcePostId?: string) => void;
  orderingCommerce?: boolean;
  commerceOrders?: Record<string, { message: string }>;
  onRefresh: () => void;
  onDemoPost?: (body: string) => void;
  demo?: boolean;
}) {
  const [prompts, setPrompts] = useState<LifeStoryPrompt[]>([]);
  const [checkIns, setCheckIns] = useState<SafeCheckInStatus[]>([]);
  const [forwarding, setForwarding] = useState(false);
  const [forwarded, setForwarded] = useState<{ groupName: string; task: string } | null>(null);
  const [dismissedPrompts, setDismissedPrompts] = useState(false);
  const [dismissedCheckIn, setDismissedCheckIn] = useState<string | null>(null);
  const [sendingPing, setSendingPing] = useState(false);

  const isGroup = isGroupThread(threadId);
  const deferredBody = useDeferredValue(body);
  const draftMutualAid = useMemo(() => {
    if (!deferredBody.trim() || !looksLikeMutualAidText(deferredBody)) return null;
    return suggestMutualAidFromText(deferredBody, members, meId);
  }, [deferredBody, members, meId]);
  const draftCommerce = useMemo(() => {
    if (!deferredBody.trim() || !looksLikeCommerceText(deferredBody)) return null;
    return suggestCommerceFromText(deferredBody, members, meId);
  }, [deferredBody, members, meId]);

  useEffect(() => {
    if (!isGroup) return;
    if (demo) {
      setPrompts(demoLifeStoryPrompts(familyId));
      return;
    }
    let cancelled = false;
    fetch(`/api/social-prompts?familyId=${encodeURIComponent(familyId)}&memberId=${encodeURIComponent(meId)}`)
      .then((r) => r.json())
      .then((data: { prompts?: LifeStoryPrompt[] }) => {
        if (!cancelled) setPrompts(data.prompts ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [demo, familyId, meId, isGroup, posts.length]);

  useEffect(() => {
    if (!isGroup) return;
    if (demo) {
      setCheckIns(demoSafeCheckIns(familyId, meId, members, posts));
      return;
    }
    let cancelled = false;
    const load = () => {
      fetch(`/api/check-in?familyId=${encodeURIComponent(familyId)}&memberId=${encodeURIComponent(meId)}`)
        .then((r) => r.json())
        .then((data: { statuses?: SafeCheckInStatus[] }) => {
          if (!cancelled) setCheckIns(data.statuses ?? []);
        })
        .catch(() => {});
    };
    load();
    const timer = window.setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [demo, familyId, meId, isGroup, members, posts]);

  const visibleCheckIn = checkIns.find((c) => c.memberId !== meId && c.memberId !== dismissedCheckIn);

  async function forwardMutualAid(suggestion: MutualAidSuggestion, groupId: string, groupName: string) {
    setForwarding(true);
    if (demo) {
      const data = demoForwardMutualAid(groupName, suggestion.task);
      setForwarded({ groupName: data.groupName, task: data.task });
      setMutualAidHint(null);
      setForwarding(false);
      return;
    }
    const res = await fetch("/api/mutual-aid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familyId,
        authorId: meId,
        requesterId: suggestion.requesterId,
        task: suggestion.task,
        sourceText: suggestion.sourceText,
        sourcePostId: suggestion.sourcePostId,
        groupId,
        groupName,
      }),
    });
    setForwarding(false);
    if (res.ok) {
      const data = (await res.json()) as { groupName?: string; task?: string };
      setForwarded({ groupName: data.groupName ?? groupName, task: data.task ?? suggestion.task });
      setMutualAidHint(null);
    }
  }

  async function sendCheckInPing(status: SafeCheckInStatus) {
    setSendingPing(true);
    const emoji = status.stage === "alert" ? `☀️ Checking in on you, ${status.memberName}!` : `☀️ ${meName.split(" ")[0]} sent a sunny hello to the circle!`;
    if (demo) {
      demoAcknowledgeCheckIn(familyId, status.memberId);
      onDemoPost?.(emoji);
      setCheckIns(demoSafeCheckIns(familyId, meId, members, posts));
      setSendingPing(false);
      setDismissedCheckIn(status.memberId);
      return;
    }
    await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familyId,
        authorId: meId,
        threadId: GROUP_THREAD,
        kind: "text",
        body: emoji,
      }),
    });
    await fetch("/api/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familyId,
        memberId: meId,
        targetMemberId: status.memberId,
        action: status.stage === "alert" ? "alert" : "acknowledge",
      }),
    });
    setSendingPing(false);
    setDismissedCheckIn(status.memberId);
    onRefresh();
  }

  const myPrompts = prompts.filter((p) => p.forMemberId === meId);

  return (
    <>
      {isGroup ? <SocialDemoGuide /> : null}

      {isGroup && myPrompts.length && !dismissedPrompts ? (
        <div className="mx-3 mb-2 border border-rule bg-surface px-3 py-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-mute">
              <SparkIcon className="text-clinic" />
              Conversation starters
              <span className="font-normal">· {META_MUSE_ATTRIBUTION}</span>
            </p>
            <button type="button" onClick={() => setDismissedPrompts(true)} className="text-[11px] text-mute hover:text-ink">
              Dismiss
            </button>
          </div>
          <div className="space-y-2">
            {myPrompts.slice(0, 3).map((p) => (
              <div key={p.id} className="rounded-sm border border-rule bg-accent-tint/40 px-2.5 py-2">
                <p className="text-sm text-ink">{p.prompt}</p>
                {p.reason ? <p className="mt-0.5 text-[11px] text-mute">{p.reason}</p> : null}
                <button
                  type="button"
                  onClick={() => setBody(p.prompt.replace(/^Ask /i, "").trim())}
                  className="mt-1 text-[11px] font-medium text-clinic hover:underline"
                >
                  Use in chat
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {isGroup && visibleCheckIn ? (
        <div
          className={`mx-3 mb-2 border px-3 py-2 text-sm ${
            visibleCheckIn.stage === "alert"
              ? "border-amber-300 bg-amber-50 text-amber-950"
              : "border-rule bg-accent-tint"
          }`}
        >
          <p className="flex items-center gap-1.5 font-medium">
            <HeartIcon className={visibleCheckIn.stage === "alert" ? "text-amber-700" : "text-clinic"} />
            {visibleCheckIn.stage === "alert" ? "Safe check-in" : "Hestia missed someone today"}
          </p>
          <p className="mt-1 text-xs opacity-90">{visibleCheckIn.pingMessage}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={sendingPing}
              onClick={() => sendCheckInPing(visibleCheckIn)}
              className={`rounded-sm px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${
                visibleCheckIn.stage === "alert" ? "bg-amber-700 hover:bg-amber-800" : "bg-ember hover:bg-ember-dark"
              }`}
            >
              {visibleCheckIn.stage === "alert" ? "Send a warm check-in" : "☀️ Send sunny emoji"}
            </button>
            <button
              type="button"
              onClick={() => setDismissedCheckIn(visibleCheckIn.memberId)}
              className="text-xs text-mute hover:text-ink"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {forwarded ? (
        <div className="mx-3 mb-2 border border-rule bg-accent-tint px-3 py-2 text-sm">
          <p className="font-medium text-ink">Sent to {forwarded.groupName}</p>
          <p className="text-xs text-mute">Local volunteers notified about: {forwarded.task}</p>
          <button type="button" onClick={() => setForwarded(null)} className="mt-1 text-xs text-mute hover:text-ink">
            Dismiss
          </button>
        </div>
      ) : null}

      {mutualAidHint ? (
        <div className="mx-3 mb-2 border border-ember/30 bg-ember/5 px-3 py-2 text-sm">
          <p className="font-medium text-ink">
            {mutualAidHint.requesterName} needs help with a task
          </p>
          <p className="text-xs text-mute">{mutualAidHint.task}</p>
          <p className="mt-1 text-xs text-mute">
            Tap to forward this request to her local community helper network.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {mutualAidHint.groups.map((g) => (
              <button
                key={g.id}
                type="button"
                disabled={forwarding}
                onClick={() => forwardMutualAid(mutualAidHint, g.id, g.name)}
                className="rounded-sm border border-ember/40 bg-surface px-2.5 py-1 text-xs font-medium text-ember hover:bg-ember/10 disabled:opacity-50"
              >
                {g.name}
              </button>
            ))}
            <button type="button" onClick={() => setMutualAidHint(null)} className="text-xs text-mute hover:text-ink">
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {draftMutualAid && !mutualAidHint ? (
        <div className="mx-3 mb-2 border border-rule bg-surface px-3 py-2">
          <p className="mb-1 text-[11px] font-medium text-mute">Local assistance detected</p>
          <MutualAidChip
            suggestion={draftMutualAid}
            onForward={(groupId, groupName) => forwardMutualAid(draftMutualAid, groupId, groupName)}
            busy={forwarding}
          />
        </div>
      ) : null}

      {commerceHint ? (
        <div className="mx-3 mb-2">
          <CommerceCard
            suggestion={commerceHint}
            onOrder={() => onPlaceCommerceOrder(commerceHint, commerceHint.sourcePostId)}
            busy={orderingCommerce}
            ordered={commerceHint.sourcePostId ? commerceOrders[commerceHint.sourcePostId] : commerceOrders.draft}
          />
          {!commerceOrders[commerceHint.sourcePostId ?? "draft"] ? (
            <button
              type="button"
              onClick={() => setCommerceHint(null)}
              className="mt-1 text-xs text-mute hover:text-ink"
            >
              Dismiss
            </button>
          ) : null}
        </div>
      ) : null}

      {draftCommerce && !commerceHint ? (
        <div className="mx-3 mb-2">
          <CommerceCard
            suggestion={draftCommerce}
            onOrder={() => onPlaceCommerceOrder(draftCommerce)}
            busy={orderingCommerce}
            ordered={commerceOrders.draft}
          />
        </div>
      ) : null}
    </>
  );
}

export { MutualAidChip, suggestMutualAidFromText };
