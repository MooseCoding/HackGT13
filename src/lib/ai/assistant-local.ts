import { DIGEST_NAME } from "../digest-constants";

export type AssistantContext = {
  familyName?: string;
  inviteCode?: string;
  memberNames?: string[];
  postingAs?: string;
  upcomingEvents?: string[];
  recentPosts?: string[];
  path?: string;
  /** Long-term notes recalled from Backboard memory. May be stale; app data wins. */
  rememberedNotes?: string[];
};

/** Client-safe pending action shape (no server imports). */
export type PendingAssistantAction =
  | {
      kind: "event";
      draftText: string;
      title: string;
      when: string;
      location?: string;
    }
  | {
      kind: "reminder";
      text: string;
      assigneeId: string;
      assigneeName: string;
      dueHint: string;
      dueAt?: string;
    }
  | {
      kind: "navigate";
      href: string;
      label: string;
    };

/** Keyword helper — no vendor models, no network, safe for client components. */
export function answerFamilyAssistant(message: string, ctx?: AssistantContext): string {
  const q = message.toLowerCase().trim();
  if (!q) return `Ask about Chats, Calendar, ${DIGEST_NAME}, invites, switching circles, or Settings.`;

  const events = ctx?.upcomingEvents?.length ? ctx.upcomingEvents : [];
  const posts = ctx?.recentPosts?.length ? ctx.recentPosts : [];
  const names = ctx?.memberNames?.length ? ctx.memberNames.join(", ") : "";
  const who = ctx?.postingAs ? `You’re posting as ${ctx.postingAs}. ` : "";

  if (q.includes("switch") || q.includes("another circle") || q.includes("other family")) {
    return `${who}Open Settings and choose a different circle under Circle, or join or create one there.`;
  }

  if (q.includes("invite") || q.includes("add member") || q.includes("join") || q.includes("code")) {
    return ctx?.inviteCode
      ? `${who}To invite someone: open your family chat and tap Invite to copy your code or send an email link. To join another circle yourself, open Settings → Circle.`
      : `${who}To invite someone: open your family chat and tap Invite. You can belong to multiple circles — switch under Settings → Circle.`;
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
    return `${list}\n\nI can draft a calendar event for you here — tell me the title, day, and time.`;
  }

  if (q.includes("digest") || q.includes("hestia") || q.includes("this week") || q.includes("recap") || q.includes("story")) {
    const recent = posts.length ? ` Recent notes: ${posts.slice(0, 3).join(" · ")}` : "";
    return `Open ${DIGEST_NAME} for this week's story from your chats and calendar.${recent}`;
  }

  if (q.includes("easy") || q.includes("larger text") || q.includes("bigger text") || q.includes("settings")) {
    return "Open Settings in the header for theme, time zone, time format, Hestia generation, larger text, and sign out.";
  }

  if (q.includes("dark") || q.includes("light mode") || q.includes("theme")) {
    return "Open Settings → Theme to choose light, dark, or match your device.";
  }

  if (q.includes("time zone") || q.includes("timezone")) {
    return "Open Settings → Time zone. Auto uses your device clock and location when available.";
  }

  if (q.includes("chat") || q.includes("message") || q.includes("photo") || q.includes("voice")) {
    return `${who}In Chats you can message the whole circle or one person, send photos, or use the mic for voice-to-text.`;
  }

  if (q.includes("who") && (q.includes("family") || q.includes("here") || q.includes("member"))) {
    return names ? `${ctx?.familyName ? `${ctx.familyName}: ` : ""}${names}.` : "Open Chats to see everyone in the circle.";
  }

  if (q.includes("help") || q === "hi" || q === "hello") {
    return `${who}I can check the calendar, draft events and reminders, and help with ${DIGEST_NAME}, invites, and Settings.`;
  }

  return `${who}I can help with Chats, Calendar, reminders, ${DIGEST_NAME}, invites, and Settings. Try “What’s on today?” or “Add school dropoff on October 1 at 8am”.`;
}
