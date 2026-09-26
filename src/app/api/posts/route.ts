import { mergedEventsOf } from "@/lib/calendar-data";
import { parseEvent } from "@/lib/calendar-parse";
import { inCalendarWindow } from "@/lib/calendar-window";
import { eventsMatch } from "@/lib/calendar-merge";
import { postThreadId } from "@/lib/chat";
import { calendarAnchor, now } from "@/lib/clock";
import { addEventRow, addPostRow, membersOf, postingIdentity, postsForThread, postsOf, resolveFamilyId } from "@/lib/data";
import { proposeWeeklyFamilyCalls } from "@/lib/family-call-schedule";
import { googleAccessToken, syncEventsToGoogle, syncEventToGoogle } from "@/lib/google-calendar";
import { isDemoMode } from "@/lib/mode-server";
import { suggestReminderFromText } from "@/lib/remind-detect";
import { findScheduleProposalForConfirmation, suggestScheduleFromText } from "@/lib/schedule-detect";
import type { CalendarEvent, Post, PostKind } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const familyId = await resolveFamilyId();
  const threadId = req.nextUrl.searchParams.get("threadId");
  const posts = threadId ? await postsForThread(familyId, threadId) : await postsOf(familyId);
  return NextResponse.json({ posts, members: await membersOf(familyId) });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<Post> & { authorId: string; familyId: string };
  try {
    const identity = await postingIdentity(body.familyId, body.authorId);
    const post: Post = {
      id: `p-${Date.now()}`,
      familyId: identity.familyId,
      authorId: identity.memberId,
      kind: (body.kind as PostKind) || "text",
      body: body.body || "",
      createdAt: (await isDemoMode()) ? now() : new Date().toISOString(),
      photoUrl: body.photoUrl,
      photoAlt: body.photoAlt,
      voiceSeconds: body.voiceSeconds,
      transcript: body.transcript,
      threadId: body.threadId,
      channel: body.channel ?? "hearth",
      audioMetrics: body.audioMetrics,
      rawRetained: body.rawRetained ?? true,
    };
    const saved = await addPostRow(post);
    const demo = await isDemoMode();
    const anchor = calendarAnchor(demo);
    const [members, events] = await Promise.all([
      membersOf(identity.familyId),
      mergedEventsOf(identity.familyId, { anchor }),
    ]);
    const postText = post.transcript || post.body;
    const scheduleSuggestion = suggestScheduleFromText(postText, members, events, {
      familyId: identity.familyId,
      createdBy: identity.memberId,
      anchor,
    });
    const reminderSuggestion = suggestReminderFromText(postText, members, identity.memberId, anchor);

    let calendarEvent: CalendarEvent | null = null;
    let calendarEvents: CalendarEvent[] | undefined;
    const threadPosts = await postsForThread(identity.familyId, postThreadId(saved));
    const confirmedProposal = findScheduleProposalForConfirmation(
      post.transcript || post.body,
      threadPosts,
      saved.id,
      members,
      events,
      { familyId: identity.familyId, anchor },
    );

    if (confirmedProposal) {
      const googleToken = await googleAccessToken();
      if (confirmedProposal.weeklyFamilyCall) {
        const proposed = proposeWeeklyFamilyCalls(events, {
          familyId: identity.familyId,
          createdBy: identity.memberId,
          members,
          anchor,
        });
        const savedEvents: CalendarEvent[] = [];
        for (const event of proposed) {
          if (events.some((existing) => eventsMatch(existing, event))) continue;
          savedEvents.push(
            await addEventRow({
              ...event,
              calendarScope: "family",
            }),
          );
        }
        if (savedEvents.length) {
          if (googleToken) {
            const synced = await syncEventsToGoogle(googleToken, savedEvents);
            calendarEvents = synced.events;
            calendarEvent = synced.events[0];
          } else {
            calendarEvents = savedEvents;
            calendarEvent = savedEvents[0];
          }
        }
      } else {
        const parsed = parseEvent(
          confirmedProposal.sourceText,
          members,
          identity.memberId,
          identity.familyId,
          anchor,
        );
        const titled = { ...parsed, title: confirmedProposal.title };
        if (inCalendarWindow(titled.startsAt, anchor) && !events.some((existing) => eventsMatch(existing, titled))) {
          let row = await addEventRow({
            ...titled,
            id: `evt-f-${Date.now()}`,
            calendarScope: "family",
            attendees: members.map((m) => m.id),
          });
          if (googleToken) {
            try {
              row = await syncEventToGoogle(googleToken, row);
            } catch (err) {
              console.error("Google sync from chat:", err);
            }
          }
          calendarEvent = row;
        }
      }
    }

    return NextResponse.json({ ...saved, scheduleSuggestion, reminderSuggestion, calendarEvent, calendarEvents });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create post." },
      { status: 403 },
    );
  }
}
