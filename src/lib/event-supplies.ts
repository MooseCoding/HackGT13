import { calendarHintsForText } from "./chat-calendar-hints";
import type { CalendarEvent, CommerceSuggestion, EventSupplyItem, Member, MemberId } from "./types";

const GATHERING_RE =
  /\b(dinner|lunch|brunch|breakfast|bbq|cookout|party|potluck|book club|tournament|game|picnic|gathering|stew|digest)\b/i;

const BRING_RE =
  /\b(i(?:'ll| will) bring|bringing|can bring|who(?:'s| is) bringing|we need|need someone to bring|bring list|bring a|bring some)\b/i;

const BRING_ITEM_RE =
  /\b(?:i(?:'ll| will) bring|bringing|can bring|need (?:someone to bring|a|some)?)\s+([a-z][\w\s-]{2,28}?)(?:\s+(?:to|for|at|on|and|\.|,)|$)/i;

function eventBlob(event: CalendarEvent) {
  return [event.title, event.location, event.sourceText].filter(Boolean).join(" ").toLowerCase();
}

function firstName(member: Member) {
  return member.name.split(" ")[0];
}

export function isGatheringEvent(event: CalendarEvent) {
  if (event.calendarScope === "mine") return false;
  return GATHERING_RE.test(eventBlob(event));
}

export function canClaimSupplies(event: CalendarEvent) {
  return isGatheringEvent(event) && !event.isGoogleSynced && !event.id.startsWith("google_");
}

function supplyId(eventId: string, item: string) {
  return `${eventId}-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function defaultItemsForEvent(event: CalendarEvent): string[] {
  const blob = eventBlob(event);

  if (/\bsoccer|tournament|game|match|sport\b/.test(blob)) {
    return ["Snacks", "Camp chairs", "Drinks", "Sunscreen"];
  }
  if (/\bbook club|porch\b/.test(blob)) {
    return ["Food to share", "Porch chairs", "Drinks", "Napkins"];
  }
  if (/\bdigest|family dinner|stew|potluck\b/.test(blob)) {
    return ["Side dish", "Dessert", "Drinks", "Bread"];
  }
  if (/\bbbq|cookout|party|picnic\b/.test(blob)) {
    return ["Main dish", "Side dish", "Drinks", "Plates & napkins"];
  }
  return ["Snacks", "Drinks", "Something to share"];
}

/** Seed a bring list when an event looks like a gathering. */
export function defaultSuppliesForEvent(event: CalendarEvent): EventSupplyItem[] {
  if (!isGatheringEvent(event)) return [];
  return defaultItemsForEvent(event).map((item) => ({
    id: supplyId(event.id, item),
    item,
  }));
}

export function ensureEventSupplies(event: CalendarEvent): CalendarEvent {
  if (event.supplies?.length || !isGatheringEvent(event)) return event;
  return { ...event, supplies: defaultSuppliesForEvent(event) };
}

export function nextSupplyClaim(
  event: CalendarEvent,
  supplyId: string,
  memberId: MemberId,
): EventSupplyItem[] {
  const supplies = [...(event.supplies ?? [])];
  const idx = supplies.findIndex((s) => s.id === supplyId);
  if (idx < 0) return supplies;

  const current = supplies[idx];
  if (current.claimedBy === memberId) {
    supplies[idx] = { ...current, claimedBy: undefined };
  } else {
    supplies[idx] = { ...current, claimedBy: memberId };
  }
  return supplies;
}

export function claimerName(members: Member[], memberId?: MemberId) {
  if (!memberId) return null;
  return members.find((m) => m.id === memberId)?.name.split(" ")[0] ?? null;
}

export function unclaimedSupplies(event: CalendarEvent) {
  return (event.supplies ?? []).filter((s) => !s.claimedBy);
}

export type BringListHint = {
  event: CalendarEvent;
  matchedItem?: EventSupplyItem;
  addItem?: string;
};

const BRING_ITEM_HINT_RE = /\bjollof|chairs|drinks|snacks|dessert|plates\b/i;

/** Cheap first pass - skip bring-list matching unless the message is about bringing something. */
export function looksLikeBringListText(text: string) {
  const raw = text.trim();
  if (raw.length < 8) return false;
  return BRING_RE.test(raw) || BRING_ITEM_HINT_RE.test(raw);
}

/** Link chat text about bringing things to a calendar event. */
export function suggestBringListFromText(
  text: string,
  events: CalendarEvent[],
  members: Member[],
  authorId: string,
  priorMessage?: string,
): BringListHint | null {
  const raw = text.trim();
  if (!looksLikeBringListText(raw)) return null;

  const hints = calendarHintsForText(raw, events, priorMessage);
  const best = hints[0];
  if (!best || best.score < 4) return null;

  const event = ensureEventSupplies(best.event);
  if (!canClaimSupplies(event)) return null;

  const itemMatch = raw.match(BRING_ITEM_RE);
  const itemName = itemMatch?.[1]?.trim().replace(/\s+/g, " ");
  if (itemName && itemName.length >= 3) {
    const normalized = itemName.toLowerCase();
    const matched = event.supplies?.find(
      (s) =>
        s.item.toLowerCase().includes(normalized) ||
        normalized.includes(s.item.toLowerCase().split(" ")[0] ?? ""),
    );
    if (matched) return { event, matchedItem: matched };
    return { event, addItem: itemName.charAt(0).toUpperCase() + itemName.slice(1) };
  }

  if (/\bwho(?:'s| is) bringing\b/i.test(raw)) {
    return { event };
  }

  const author = members.find((m) => m.id === authorId);
  if (author && /\bi(?:'ll| will) bring\b/i.test(raw)) {
    const firstOpen = event.supplies?.find((s) => !s.claimedBy);
    if (firstOpen) return { event, matchedItem: firstOpen };
  }

  return { event };
}

export function buildBringListCommerceSuggestion(
  event: CalendarEvent,
  supply: EventSupplyItem,
  recipient: Member,
  options?: { deliveryAddress?: string },
): CommerceSuggestion {
  const host = event.location?.split("·")[0]?.trim() || "the gathering";
  const address = options?.deliveryAddress ?? host;
  return {
    kind: "supply",
    title: `${supply.item} for ${event.title}`,
    items: [{ name: supply.item }],
    recipientId: recipient.id,
    recipientName: firstName(recipient),
    estimatedTotal: 14.99,
    deliveryAddress: address,
    sourceText: `Order ${supply.item} for ${event.title}`,
    orderLabel: `Order ${supply.item} instead`,
    eventId: event.id,
    supplyId: supply.id,
  };
}
