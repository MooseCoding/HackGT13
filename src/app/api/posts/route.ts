import { recordActivity } from "@/lib/activity";
import { mergedEventsOf } from "@/lib/calendar-data";
import { parseEvent } from "@/lib/calendar-parse";
import { inCalendarWindow } from "@/lib/calendar-window";
import { eventsMatch } from "@/lib/calendar-merge";
import { postThreadId } from "@/lib/chat";
import { calendarAnchor, now } from "@/lib/clock";
import { addEventRow, addPostRow, membersOf, postingIdentity, postsForThread, postsOf, resolveFamilyId } from "@/lib/data";
import { broadcastEventPin } from "@/lib/event-pin";
import { proposeWeeklyFamilyCalls } from "@/lib/family-call-schedule";
import { googleAccessToken, syncEventsToGoogle, syncEventToGoogle } from "@/lib/google-calendar";
import { isDemoMode } from "@/lib/mode-server";
import { detectCheckInSuggestion } from "@/lib/clinical/check-in";
import { suggestReminderFromText } from "@/lib/remind-detect";
import { findScheduleProposalForConfirmation, suggestScheduleFromText } from "@/lib/schedule-detect";
import { suggestMutualAidFromText } from "@/lib/mutual-aid-detect";
import { suggestCommerceFromText } from "@/lib/commerce-detect";
import { groqMutualAidTask } from "@/lib/ai/social";
import type { CalendarEvent, CommerceSuggestion, MutualAidSuggestion, Post, PostKind } from "@/lib/types";
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
      id: `p-${crypto.randomUUID()}`,
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
      channel: "hearth",
      rawRetained: true,
    };
    const saved = await addPostRow(post);
    try {
      recordActivity(
        identity.familyId,
        identity.memberId,
        post.kind === "voice" ? "voice" : "post",
        saved.createdAt,
      );
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
    let mutualAidSuggestion: MutualAidSuggestion | null = suggestMutualAidFromText(
      postText,
      members,
      identity.memberId,
    );
    if (mutualAidSuggestion) {
      const refined = await groqMutualAidTask(postText);
      if (refined) {
        mutualAidSuggestion = { ...mutualAidSuggestion, task: refined.task };
      }
    }
    const threadPosts = await postsForThread(identity.familyId, postThreadId(saved));
    const priorPost = threadPosts.length > 1 ? threadPosts[threadPosts.length - 2] : undefined;
    const priorMessage = priorPost ? priorPost.transcript || priorPost.body : undefined;
    const commerceSuggestion: CommerceSuggestion | null = suggestCommerceFromText(
      postText,
      members,
      identity.memberId,
      { events, priorMessage },
    );

    let calendarEvent: CalendarEvent | null = null;
    let calendarEvents: CalendarEvent[] | undefined;
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
          await broadcastEventPin(row, identity.memberId).catch((err) => {
            console.error("Event pin broadcast failed:", err);
          });
        }
      }
    }

      const checkInSuggestion = detectCheckInSuggestion(post.transcript || post.body);
      return NextResponse.json({
        ...saved,
        scheduleSuggestion,
        reminderSuggestion,
        mutualAidSuggestion,
        commerceSuggestion,
        calendarEvent,
        calendarEvents,
        checkInSuggestion,
      });
    } catch (enrichmentError) {
      // The message is already committed. Optional calendar/AI enrichment must
      // never turn a successful send into a failed chat request.
      console.error("Post-send enrichment failed; returning the saved message.", enrichmentError);
      return NextResponse.json({ ...saved, enrichmentWarning: "Message sent; suggestions are temporarily unavailable." });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create post." },
      { status: 403 },
    );
  }
}
