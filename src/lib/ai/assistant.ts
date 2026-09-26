import { groqConfigured } from "./config";
import { groqChat, type GroqMessage } from "./groq";
import { ASSISTANT_SYSTEM_PROMPT } from "./prompts";

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

function contextBlock(ctx: AssistantContext) {
  const lines = [
    "Current Hearth context (use when helpful; do not invent beyond this):",
    ctx.familyName ? `Family: ${ctx.familyName}` : null,
    ctx.postingAs ? `User is posting as: ${ctx.postingAs}` : null,
    ctx.inviteCode ? `Invite code: ${ctx.inviteCode}` : null,
    ctx.memberNames?.length ? `Members: ${ctx.memberNames.join(", ")}` : null,
    ctx.path ? `They are viewing: ${ctx.path}` : null,
    ctx.upcomingEvents?.length
      ? `Upcoming events:\n${ctx.upcomingEvents.map((e) => `- ${e}`).join("\n")}`
      : "Upcoming events: (none loaded)",
    ctx.recentPosts?.length
      ? `Recent posts:\n${ctx.recentPosts.map((p) => `- ${p}`).join("\n")}`
      : "Recent posts: (none loaded)",
  ].filter(Boolean);
  return lines.join("\n");
}

export async function runFamilyAssistant(input: {
  message: string;
  history?: AssistantTurn[];
  context?: AssistantContext;
}): Promise<{ reply: string; source: "groq" | "local" }> {
  const message = input.message.trim();
  if (!message) throw new Error("Say something first.");

  if (!groqConfigured()) {
    return { reply: localAssistantReply(message, input.context), source: "local" };
  }

  const history = (input.history ?? []).slice(-10);
  const messages: GroqMessage[] = [
    { role: "system", content: ASSISTANT_SYSTEM_PROMPT },
    {
      role: "system",
      content: contextBlock(input.context ?? {}),
    },
    ...history.map((t) => ({ role: t.role, content: t.content }) as GroqMessage),
    { role: "user", content: message },
  ];

  try {
    const reply = await groqChat({
      messages,
      temperature: 0.5,
      maxTokens: 500,
    });
    return { reply, source: "groq" };
  } catch (err) {
    console.error("Assistant Groq error:", err);
    return { reply: localAssistantReply(message, input.context), source: "local" };
  }
}

/** Offline / no-key helper so the widget still works in demo. */
function localAssistantReply(message: string, ctx?: AssistantContext): string {
  const q = message.toLowerCase();
  if (q.includes("invite") || q.includes("add member") || q.includes("join")) {
    return ctx?.inviteCode
      ? `To invite someone: open Chats → + Add member, or share invite code ${ctx.inviteCode}. They can also open Join a circle on onboarding.`
      : "To invite someone: open Chats → + Add member, or share the invite code shown in the header.";
  }
  if (q.includes("calendar") || q.includes("schedule") || q.includes("event")) {
    return "Open Calendar. Type a sentence like “Family dinner Friday at 6 PM”. Connect Google Calendar to pull in prior events. From chat, if you mention a call or time, Hearth can suggest “Add to calendar”.";
  }
  if (q.includes("digest") || q.includes("week") || q.includes("recap") || q.includes("story")) {
    return "Open This week for the family story. Tap Refresh to regenerate (uses Groq when GROQ_API_KEY is set). Tap Listen to hear it aloud.";
  }
  if (q.includes("clinician") || q.includes("doctor") || q.includes("sharing") || q.includes("hcp")) {
    return "Clinician view only sees members who turned on Share with care team. Toggle that in the header. Insights compare someone to their own baseline — not a diagnosis.";
  }
  if (q.includes("easy")) {
    return "Turn on Easy in the header for larger text and bigger tap targets — helpful for elders.";
  }
  if (q.includes("chat") || q.includes("message") || q.includes("photo") || q.includes("voice")) {
    return "In Chats you can message the whole circle or one person, send photos, or use Talk for voice-to-text.";
  }
  return "I can help with Chats, Calendar, This week, invites, Easy mode, and clinician sharing. Ask something like “How do I invite Sofia?” or “What’s on the calendar?”";
}
