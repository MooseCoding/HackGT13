import {
  buildBringListCommerceSuggestion,
  ensureEventSupplies,
  suggestBringListFromText,
  type BringListHint,
} from "./event-supplies";
import type { CalendarEvent, CommerceItem, CommerceSuggestion, Member } from "./types";

/** Must mention buying, bringing, getting, or restocking — nothing else triggers shopping. */
const PURCHASE_INTENT_RE =
  /\b(?:buy(?:ing)?|purchase|order(?:ing)?|pick\s*up|get(?:ting)?\s+(?:some|a)|grab|shop\s+for|from\s+the\s+(?:store|market|grocery)|ran\s+out\s+of|running\s+out\s+of|need\s+more|almost\s+out\s+of|low\s+on|out\s+of|need\s+to\s+(?:buy|get|pick\s*up)|restock|i(?:'ll|\s+will)\s+bring|bringing|can\s+bring|who(?:'s|\s+is)\s+bringing|need\s+someone\s+to\s+bring|bring\s+(?:a|some|the)|we\s+need)\b/i;

const SCHOOL_PROJECT_RE =
  /\b(science project|science fair|volcano project|volcano|diorama|display board|poster board|baking soda|food coloring)\b/i;

const SUPPLY_NEED_RE =
  /\b(ran out of|running out of|need more|almost out of|low on|out of|need to get|need to buy|pick up some|we need)\b/i;

const MEDICAL_SKIP_RE =
  /\b(911|ambulance|emergency|chest pain|stroke|bleeding|hospital|can't breathe)\b/i;

const MUTUAL_AID_SKIP_RE =
  /\b(too heavy|can't carry|can't lift|can't reach|help me carry|someone nearby)\b/i;

const BRING_ITEM_RE =
  /\b(?:i(?:'ll|\s+will)\s+bring|bringing|can\s+bring|need\s+(?:someone\s+to\s+bring|a|some)?|(?:buy|get|pick\s*up|order|grab)\s+(?:some\s+)?)\s*(?:the\s+)?([a-z][\w\s-]{2,30}?)(?:\s+(?:to|for|at|on|instead|and|\.|,)|$)/i;

const VOLCANO_KIT: CommerceItem[] = [
  { name: "Baking soda (16 oz)" },
  { name: "Food coloring set" },
  { name: "White vinegar" },
  { name: "Poster board" },
  { name: "Modeling clay" },
];

const DEFAULT_PROJECT_KIT: CommerceItem[] = [
  { name: "Poster board" },
  { name: "Glue sticks (6-pack)" },
  { name: "Colored markers" },
  { name: "Construction paper" },
];

export type CommerceDetectOptions = {
  events?: CalendarEvent[];
  priorMessage?: string;
  /** Reuse an already-computed bring hint to avoid duplicate calendar scans. */
  bringHint?: BringListHint | null;
};

function firstName(member: Member) {
  return member.name.split(" ")[0];
}

function deliveryAddress(member: Member): string {
  const parts = [
    member.street,
    member.apt,
    [member.city, member.state, member.postalCode].filter(Boolean).join(", "),
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : member.location;
}

const RECIPIENT_STOP_WORDS = new Set([
  "a",
  "an",
  "any",
  "everyone",
  "her",
  "him",
  "his",
  "it",
  "its",
  "me",
  "my",
  "our",
  "some",
  "someone",
  "that",
  "the",
  "their",
  "them",
  "this",
  "us",
  "we",
  "you",
  "your",
  "store",
  "market",
  "grocery",
  "shop",
  "game",
  "party",
  "dinner",
  "lunch",
  "brunch",
  "gathering",
  "tournament",
  "friday",
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "tomorrow",
  "today",
  "tonight",
]);

function memberFromToken(token: string, members: Member[]): Member | undefined {
  const normalized = token
    .toLowerCase()
    .replace(/['']s$/, "")
    .trim();
  if (!normalized || normalized.length < 2 || RECIPIENT_STOP_WORDS.has(normalized)) {
    return undefined;
  }

  if (normalized === "ma" || normalized === "grandma" || normalized === "abuela") {
    return members.find((m) => /\babuela\b|grandmother/i.test(m.role));
  }
  if (normalized === "nana") {
    return members.find((m) => /\bnana\b/i.test(m.role));
  }
  if (normalized === "mijo") {
    return members.find((m) => firstName(m).toLowerCase() === "miguel");
  }

  const byFirst = members.filter((m) => firstName(m).toLowerCase() === normalized);
  if (byFirst.length === 1) return byFirst[0];

  const byFull = members.filter((m) => m.name.toLowerCase().includes(normalized));
  if (byFull.length === 1) return byFull[0];

  return byFirst[0] ?? byFull[0];
}

function extractExplicitRecipientToken(raw: string): string | null {
  const patterns = [
    /\b(?:send|ship|deliver)\s+(?:it\s+)?to\s+([\w'-]+)/i,
    /\b(?:drop|bring)\s+(?:it\s+)?(?:off\s+)?(?:at|to)\s+([\w'-]+)/i,
    /\b(?:can\s+i\s+)?(?:buy|get|order|pick\s*up|grab)\s+(you|her|him|me|them)\s+(?:a|an|some)\s+/i,
    /\b(?:can\s+i\s+)?(?:buy|get|order|pick\s*up|grab)\s+(?!a\b|an\b|some\b)([\w'-]+)\s+(?:a|an|some)\s+/i,
    /\b(?:buy|get|order|pick\s*up|grab)\s+(?:[\w'-]+\s+){0,8}for\s+([\w'-]+)/i,
    /\bfor\s+([\w'-]+)(?:\s*['']s)?\s+(?:project|supplies|science|volcano|diorama|tea|cold|flu|birthday)/i,
    /\bto\s+([\w'-]+)\s*['']s\s+(?:house|home|place|apartment|dorm)/i,
  ];
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function findMentionedMember(raw: string, members: Member[], authorId: string): Member | undefined {
  const lower = raw.toLowerCase();
  const ranked = [...members].sort(
    (a, b) => b.name.length - a.name.length || a.name.localeCompare(b.name),
  );
  let best: Member | undefined;
  for (const member of ranked) {
    const first = firstName(member).toLowerCase();
    const full = member.name.toLowerCase();
    if (lower.includes(full) || lower.includes(first)) {
      if (member.id !== authorId) return member;
      best = member;
    }
  }
  return best;
}

/** Pick who should receive the delivery based on names, nicknames, and phrasing. */
function resolveDeliveryRecipient(raw: string, members: Member[], authorId: string): Member {
  const author = members.find((m) => m.id === authorId);
  if (!author) return members[0];

  const explicitToken = extractExplicitRecipientToken(raw);
  if (explicitToken) {
    if (GIFT_PRONOUN_RE.test(explicitToken)) {
      const mentioned = findMentionedMember(raw, members, authorId);
      if (mentioned && mentioned.id !== authorId) return mentioned;
    } else {
      const explicit = memberFromToken(explicitToken, members);
      if (explicit) return explicit;
    }
  }

  const possessive = raw.match(
    /\b([\w'-]+)['']s\s+(?:\w+\s+){0,2}(?:project|supplies|science|volcano|diorama|tea|cold|flu|birthday)/i,
  );
  if (possessive?.[1]) {
    const member = memberFromToken(possessive[1], members);
    if (member) return member;
  }

  const hasProject = raw.match(
    /\b([\w'-]+)\s+has\s+(?:a\s+)?(?:\w+\s+){0,3}(?:project|science|volcano|diorama)/i,
  );
  if (hasProject?.[1]) {
    const member = memberFromToken(hasProject[1], members);
    if (member) return member;
  }

  if (/\b(?:ma|abuela|grandma)\b/i.test(raw)) {
    const elder = memberFromToken("ma", members);
    if (elder) return elder;
  }
  if (/\bnana\b/i.test(raw)) {
    const nana = memberFromToken("nana", members);
    if (nana) return nana;
  }

  const mentioned = findMentionedMember(raw, members, authorId);
  if (mentioned) return mentioned;

  return author;
}

function isPersonDeliveryTarget(
  raw: string,
  recipient: Member,
  authorId: string,
): boolean {
  if (recipient.id !== authorId) return true;
  return Boolean(extractExplicitRecipientToken(raw));
}

function commerceDelivery(
  raw: string,
  members: Member[],
  authorId: string,
  event?: CalendarEvent,
): { recipient: Member; address: string } {
  const recipient = resolveDeliveryRecipient(raw, members, authorId);
  if (event && !isPersonDeliveryTarget(raw, recipient, authorId)) {
    const host = event.location?.split("·")[0]?.trim();
    if (host) return { recipient, address: host };
  }
  return { recipient, address: deliveryAddress(recipient) };
}

const GIFT_PRONOUN_RE = /^(?:you|her|him|me|them|us)$/i;

function cleanItemName(raw: string): string | null {
  let item = raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^(?:my|the|some|a|an)\s+/i, "")
    .replace(/^(?:you|her|him|me|them|us)\s+(?:a|an|some)\s+/i, "")
    .replace(/^(?:you|her|him|me|them|us)\s+/i, "")
    .replace(/^(?:a|an|some)\s+/i, "")
    .replace(/\s+(?:too|today|tomorrow|please|pls|\?)$/i, "")
    .trim();
  if (GIFT_PRONOUN_RE.test(item)) return null;
  if (item.length < 3 || item.length > 40) return null;
  return item;
}

function extractListedItems(raw: string): string[] {
  const needMatch = raw.match(
    /\b(?:need|get|buy|pick up|we need)\s+(.+?)(?:\s+before|\s+by|\s+due|\s+for\s+\w+day|\.|$)/i,
  );
  if (!needMatch?.[1]) return [];
  return needMatch[1]
    .split(/,|\band\b/i)
    .map((s) => cleanItemName(s))
    .filter((s): s is string => Boolean(s));
}

function extractPurchaseItem(raw: string): string | null {
  const patterns = [
    // Gift phrasing: "can I buy you a yellow scarf", "get her some tea"
    /\bcan\s+i\s+(?:buy|get|order|grab|pick\s*up)\s+(?:you|her|him|me|them)\s+(?:a|an|some)\s+([a-z][\w\s-]{2,30}?)(?:\s+(?:for|from|at|on|to|and|\.|,|\?)|$)/i,
    /\b(?:buy(?:ing)?|get(?:ting)?|grab(?:bing)?|order(?:ing)?|pick\s*up)\s+(?:you|her|him|me|them)\s+(?:a|an|some)\s+([a-z][\w\s-]{2,30}?)(?:\s+(?:for|from|at|on|to|and|\.|,|\?)|$)/i,
    // Named recipient: "buy Sofia a yellow scarf" (not "buy some milk")
    /\b(?:buy(?:ing)?|get(?:ting)?|grab(?:bing)?|order(?:ing)?|pick\s*up)\s+(?!a\b|an\b|some\b)([\w'-]+)\s+(?:a|an|some)\s+([a-z][\w\s-]{2,30}?)(?:\s+(?:for|from|at|on|to|and|\.|,|\?)|$)/i,
    /\b(?:ran out of|running out of|need more|almost out of|low on|out of|need to get|need to buy|pick up some)\s+(?:my\s+)?([a-z][\w\s-]{2,30}?)(?:\s+(?:and|before|for|at|on|this|that|today|\.|,)|$)/i,
    /\b(?:buy(?:ing)?|get(?:ting)?|grab(?:bing)?|order(?:ing)?|pick\s*up)\s+(?:some\s+|a\s+)?([a-z][\w\s-]{2,30}?)(?:\s+(?:for|from|at|on|to|and|\.|,)|$)/i,
    BRING_ITEM_RE,
  ];
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    const captured = match?.[2] ?? match?.[1];
    if (captured) {
      const item = cleanItemName(captured);
      if (item) return item;
    }
  }
  return null;
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function estimateSupplyPrice(items: CommerceItem[]): number {
  const base = 8.99;
  return Math.round((base + items.length * 4.5) * 100) / 100;
}

function buildSchoolProjectSuggestion(
  raw: string,
  members: Member[],
  authorId: string,
): CommerceSuggestion | null {
  const { recipient, address } = commerceDelivery(raw, members, authorId);

  const isVolcano = /\bvolcano\b/i.test(raw);
  const listed = extractListedItems(raw);
  const items: CommerceItem[] =
    listed.length > 0
      ? listed.map((name) => ({ name: titleCase(name) }))
      : isVolcano
        ? VOLCANO_KIT
        : DEFAULT_PROJECT_KIT;

  const projectLabel = isVolcano
    ? `Volcano Science Kit for ${firstName(recipient)}'s Project`
    : `School Project Supplies for ${firstName(recipient)}`;

  return {
    kind: "supply",
    title: projectLabel,
    items,
    recipientId: recipient.id,
    recipientName: firstName(recipient),
    estimatedTotal: estimateSupplyPrice(items),
    deliveryAddress: address,
    sourceText: raw,
    orderLabel: `Order & Deliver to ${firstName(recipient)}`,
  };
}

function buildSupplySuggestion(
  raw: string,
  members: Member[],
  authorId: string,
): CommerceSuggestion | null {
  const itemName = extractPurchaseItem(raw);
  if (!itemName) return null;

  const { recipient, address } = commerceDelivery(raw, members, authorId);

  const items: CommerceItem[] = [{ name: titleCase(itemName) }];
  if (/\btea\b/i.test(itemName)) {
    items.push({ name: "Honey sticks" });
  }
  if (/\byarn\b/i.test(itemName)) {
    items.push({ name: "Craft scissors" });
  }
  if (/\bcoffee\b/i.test(itemName)) {
    items.push({ name: "Coffee filters" });
  }

  return {
    kind: "supply",
    title: `${titleCase(itemName)} for ${firstName(recipient)}`,
    items,
    recipientId: recipient.id,
    recipientName: firstName(recipient),
    estimatedTotal: estimateSupplyPrice(items),
    deliveryAddress: address,
    sourceText: raw,
    orderLabel: `Order & Deliver to ${firstName(recipient)}`,
  };
}

function buildStandaloneBringSuggestion(
  raw: string,
  members: Member[],
  authorId: string,
): CommerceSuggestion | null {
  const itemName = extractPurchaseItem(raw);
  if (!itemName) return null;

  const { recipient, address } = commerceDelivery(raw, members, authorId);

  const items: CommerceItem[] = [{ name: titleCase(itemName) }];

  return {
    kind: "supply",
    title: `Order ${titleCase(itemName)} for ${firstName(recipient)}`,
    items,
    recipientId: recipient.id,
    recipientName: firstName(recipient),
    estimatedTotal: estimateSupplyPrice(items),
    deliveryAddress: address,
    sourceText: raw,
    orderLabel: `Order & Deliver to ${firstName(recipient)}`,
  };
}

function buildEventBringSuggestion(
  raw: string,
  members: Member[],
  authorId: string,
  events: CalendarEvent[],
  priorMessage?: string,
  bringHint?: BringListHint | null,
): CommerceSuggestion | null {
  const hint =
    bringHint ?? suggestBringListFromText(raw, events, members, authorId, priorMessage);
  if (!hint) return null;

  const event = ensureEventSupplies(hint.event);
  const { recipient, address } = commerceDelivery(raw, members, authorId, event);

  if (hint.matchedItem) {
    return buildBringListCommerceSuggestion(event, hint.matchedItem, recipient, { deliveryAddress: address });
  }

  if (hint.addItem) {
    const supply = {
      id: `${event.id}-order-${hint.addItem.toLowerCase().replace(/\s+/g, "-")}`,
      item: hint.addItem,
    };
    return buildBringListCommerceSuggestion(event, supply, recipient, { deliveryAddress: address });
  }

  const itemName = extractPurchaseItem(raw);
  if (itemName) {
    const supply = {
      id: `${event.id}-order-${itemName.toLowerCase().replace(/\s+/g, "-")}`,
      item: titleCase(itemName),
    };
    return buildBringListCommerceSuggestion(event, supply, recipient, { deliveryAddress: address });
  }

  return null;
}

/** Cheap first pass — skip shopping matching unless someone mentions buying or bringing. */
export function looksLikeCommerceText(text: string) {
  const raw = text.trim();
  if (raw.length < 8) return false;
  if (MEDICAL_SKIP_RE.test(raw) || MUTUAL_AID_SKIP_RE.test(raw)) return false;
  return PURCHASE_INTENT_RE.test(raw);
}

/** Regex-based shopping detection — only when someone mentions buying or bringing. */
export function suggestCommerceFromText(
  text: string,
  members: Member[],
  authorId: string,
  options?: CommerceDetectOptions,
): CommerceSuggestion | null {
  const raw = text.trim();
  if (!looksLikeCommerceText(raw)) return null;

  if (options?.events?.length) {
    const eventSuggestion = buildEventBringSuggestion(
      raw,
      members,
      authorId,
      options.events,
      options.priorMessage,
      options.bringHint,
    );
    if (eventSuggestion) return eventSuggestion;
  }

  if (/\b(?:bring|bringing|i(?:'ll|\s+will)\s+bring)\b/i.test(raw)) {
    const bringSuggestion = buildStandaloneBringSuggestion(raw, members, authorId);
    if (bringSuggestion) return bringSuggestion;
  }

  if (SCHOOL_PROJECT_RE.test(raw)) {
    return buildSchoolProjectSuggestion(raw, members, authorId);
  }

  if (SUPPLY_NEED_RE.test(raw) || /\b(?:buy|get|pick\s*up|order|grab)\b/i.test(raw)) {
    return buildSupplySuggestion(raw, members, authorId);
  }

  return null;
}
