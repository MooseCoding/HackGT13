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

function promptTeaser(prompt: LifeStoryPrompt): string {
  if (prompt.reason) return prompt.reason;
  if (prompt.aboutMemberName) return `Starter about ${prompt.aboutMemberName}`;
  const text = prompt.prompt.replace(/^Ask /i, "").trim();
  return text.length > 72 ? `${text.slice(0, 69)}…` : text;
}

export function ConversationStarters({
  familyId,
  meId,
  postCount,
  setBody,
  demo = false,
  easy = false,
}: {
  familyId: string;
  meId: string;
  postCount: number;
  setBody: (v: string) => void;
  demo?: boolean;
  easy?: boolean;
}) {
  const [prompts, setPrompts] = useState<LifeStoryPrompt[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);

  useEffect(() => {
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
  }, [demo, familyId, meId, postCount]);

  useEffect(() => {
    if (selectedPromptId && !prompts.some((p) => p.id === selectedPromptId)) {
      setSelectedPromptId(null);
    }
  }, [prompts, selectedPromptId]);

  const myPrompts = prompts.filter((p) => p.forMemberId === meId);
  if (!myPrompts.length) return null;

  function closePanel() {
    setPanelOpen(false);
    setSelectedPromptId(null);
  }

  return (
    <div className="px-3 pb-2">
      {panelOpen ? (
        <div className="mb-2 border border-rule bg-surface px-3 py-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className={`flex items-center gap-1.5 font-medium text-mute ${easy ? "text-sm" : "text-[11px]"}`}>
              <SparkIcon className="text-clinic" />
              Conversation starters
              <span className="font-normal">· {META_MUSE_ATTRIBUTION}</span>
            </p>
            <button
              type="button"
              onClick={closePanel}
              className={`text-mute hover:text-ink ${easy ? "text-sm" : "text-[11px]"}`}
            >
              Close
            </button>
          </div>
          <div className="space-y-1.5">
            {myPrompts.slice(0, 3).map((p) => {
              const expanded = selectedPromptId === p.id;
              return (
                <div
                  key={p.id}
                  className={`rounded-sm border bg-accent-tint/40 ${expanded ? "border-clinic/30" : "border-rule"}`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedPromptId(expanded ? null : p.id)}
                    aria-expanded={expanded}
                    className={`flex w-full items-start gap-2 text-left ${easy ? "px-3 py-2.5" : "px-2.5 py-2"}`}
                  >
                    <span
                      aria-hidden
                      className={`mt-0.5 shrink-0 text-mute transition-transform ${expanded ? "rotate-180" : ""}`}
                    >
                      ▾
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`text-ink ${easy ? "text-base" : "text-sm"}`}>{promptTeaser(p)}</span>
                      {!expanded && p.aboutMemberName ? (
                        <span className={`mt-0.5 block text-mute ${easy ? "text-sm" : "text-[11px]"}`}>
                          About {p.aboutMemberName}
                        </span>
                      ) : null}
                    </span>
                  </button>
                  {expanded ? (
                    <div className={`border-t border-rule ${easy ? "px-3 py-2.5 pl-9" : "px-2.5 py-2 pl-7"}`}>
                      <p className={`text-ink ${easy ? "text-base" : "text-sm"}`}>{p.prompt}</p>
                      {p.reason ? (
                        <p className={`mt-1 text-mute ${easy ? "text-sm" : "text-[11px]"}`}>{p.reason}</p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setBody(p.prompt.replace(/^Ask /i, "").trim());
                          closePanel();
                        }}
                        className={`mt-2 font-medium text-clinic hover:underline ${easy ? "text-sm" : "text-[11px]"}`}
                      >
                        Use in chat
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setPanelOpen((open) => !open)}
        aria-expanded={panelOpen}
        className={`flex w-full items-center justify-center gap-2 rounded-sm border border-clinic/35 bg-accent-tint font-medium text-clinic hover:bg-clinic/10 ${
          easy ? "min-h-11 px-4 py-2.5 text-base" : "px-3 py-2 text-sm"
        }`}
      >
        <SparkIcon className="shrink-0" />
        <span>Conversation starters</span>
        <span
          className={`rounded-full bg-clinic/15 font-normal text-clinic ${easy ? "px-2 py-0.5 text-sm" : "px-1.5 text-[11px]"}`}
        >
          {myPrompts.length}
        </span>
        <span
          aria-hidden
          className={`text-mute transition-transform ${panelOpen ? "rotate-180" : ""}`}
        >
          ▴
        </span>
      </button>
    </div>
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
  const [checkIns, setCheckIns] = useState<SafeCheckInStatus[]>([]);
  const [forwarding, setForwarding] = useState(false);
  const [forwarded, setForwarded] = useState<{ groupName: string; task: string } | null>(null);
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
    const emoji = status.stage === "alert" ? `❤️ Checking in on you, ${status.memberName}!` : `❤️ ${meName.split(" ")[0]} sent a hello to the circle!`;
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

  return (
    <>
      {isGroup ? <SocialDemoGuide /> : null}

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
            {visibleCheckIn.stage === "alert" ? "Safe check-in" : "Haven't heard from someone today"}
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
              {visibleCheckIn.stage === "alert" ? "Send a check-in" : "❤️ Send a hello"}
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
            Tap to forward this request to {mutualAidHint.requesterName}&apos;s local community helper network.
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
          <p className="mb-1 text-[11px] font-medium text-mute">Looks like someone nearby could help</p>
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
