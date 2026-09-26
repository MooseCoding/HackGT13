import { DIGEST_NAME } from "../digest";

export type AssistantTurn = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantContext = {
  familyName?: string;
  inviteCode?: string;
  memberNames?: string[];
  postingAs?: string;
  upcomingEvents?: string[];
  recentPosts?: string[];
  path?: string;
};

/** Keyword helper — no vendor models, no network. */
export function answerFamilyAssistant(message: string, ctx?: AssistantContext): string {
  const q = message.toLowerCase().trim();
  if (!q) return `Ask about Chats, Calendar, ${DIGEST_NAME}, invites, switching circles, or Easy mode.`;

  const events = ctx?.upcomingEvents?.length ? ctx.upcomingEvents : [];
  const posts = ctx?.recentPosts?.length ? ctx.recentPosts : [];
  const names = ctx?.memberNames?.length ? ctx.memberNames.join(", ") : "";
  const who = ctx?.postingAs ? `You’re posting as ${ctx.postingAs}. ` : "";

  if (q.includes("switch") || q.includes("another circle") || q.includes("other family")) {
    return `${who}Tap your family name in the header to switch circles, or add a new one from there.`;
  }

  if (q.includes("invite") || q.includes("add member") || q.includes("join") || q.includes("code")) {
    return ctx?.inviteCode
      ? `${who}To invite someone: Chats → + Add member, or share invite code ${ctx.inviteCode}. To join another circle yourself, tap your family name in the header.`
      : `${who}To invite someone: Chats → + Add member, or share the invite code in the header. You can belong to multiple circles — tap your family name to switch.`;
  }

  if (
    q.includes("calendar") ||
    q.includes("schedule") ||
    q.includes("event") ||
    q.includes("family call") ||
    q.includes("what’s on") ||
    q.includes("what's on")
  ) {
    const list = events.length
      ? `Coming up:\n${events.slice(0, 6).map((e) => `• ${e}`).join("\n")}`
      : "No upcoming events are loaded right now.";
    return `${list}\n\nOpen Calendar to add a sentence like “Family dinner Friday at 6 PM”. Weekly family calls are placed in open gaps between existing events — locally, no AI.`;
  }

  if (q.includes("digest") || q.includes("hestia") || q.includes("this week") || q.includes("recap") || q.includes("story")) {
    const recent = posts.length ? ` Recent notes: ${posts.slice(0, 3).join(" · ")}` : "";
    return `Open ${DIGEST_NAME} for the family story — your weekly hearth recap from chats and calendar, written on this device.${recent}`;
  }

  if (q.includes("easy")) {
    return "Turn on Easy in the header for larger text and bigger tap targets — helpful for elders.";
  }

  if (q.includes("chat") || q.includes("message") || q.includes("photo") || q.includes("voice")) {
    return `${who}In Chats you can message the whole circle or one person, send photos, or use the mic for voice-to-text.`;
  }

  if (q.includes("who") && (q.includes("family") || q.includes("here") || q.includes("member"))) {
    return names ? `${ctx?.familyName ? `${ctx.familyName}: ` : ""}${names}.` : "Open Chats to see everyone in the circle.";
  }

  if (q.includes("help") || q === "hi" || q === "hello") {
    return `${who}I can help with Chats, Calendar, ${DIGEST_NAME}, invites, Easy mode, and weekly family calls. I run on this device — no company AI.`;
  }

  return `${who}I can help with Chats, Calendar, ${DIGEST_NAME}, invites, Easy mode, and weekly family calls. Try “What’s on the calendar?” or “How do I invite someone?”`;
}

export async function runFamilyAssistant(input: {
  message: string;
  history?: AssistantTurn[];
  context?: AssistantContext;
}): Promise<{ reply: string; source: "local" }> {
  const message = input.message.trim();
  if (!message) throw new Error("Say something first.");
  return { reply: answerFamilyAssistant(message, input.context), source: "local" };
}
