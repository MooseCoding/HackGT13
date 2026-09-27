import {
  runFamilyAssistant,
  type AssistantContext,
  type AssistantTurn,
} from "@/lib/ai/assistant";
import type { PendingAssistantAction } from "@/lib/ai/family-tools";
import { calendarAnchor } from "@/lib/clock";
import {
  eventsOf,
  familyById,
  membersOf,
  postingIdentity,
  postsOf,
  requireFamilyAccess,
  resolveFamilyId,
} from "@/lib/data";
import { isDemoMode } from "@/lib/mode-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      message?: string;
      history?: AssistantTurn[];
      path?: string;
      familyId?: string;
      postingAs?: string;
      authorId?: string;
      confirm?: PendingAssistantAction;
    };

    const familyId = body.familyId || (await resolveFamilyId());
    await requireFamilyAccess(familyId);
    const [family, members, events, posts] = await Promise.all([
      familyById(familyId),
      membersOf(familyId),
      eventsOf(familyId),
      postsOf(familyId),
    ]);

    const postingAs = members.some((member) => member.name === body.postingAs)
      ? body.postingAs
      : undefined;
    const member =
      members.find((item) => item.id === body.authorId) ||
      members.find((item) => item.name === postingAs) ||
      members[0];
    if (!member) {
      return NextResponse.json({ error: "No circle member found." }, { status: 400 });
    }

    // Validate posting identity when authenticated / live.
    try {
      await postingIdentity(familyId, member.id);
    } catch {
      // Demo circles may not have a signed-in mapping; continue with resolved member.
    }

    const now = Date.now();
    const upcomingEvents = events
      .filter((e) => new Date(e.startsAt).getTime() >= now - 12 * 60 * 60 * 1000)
      .slice(0, 10)
      .map((e) => {
        const when = new Date(e.startsAt).toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
        return `${when}: ${e.title}${e.location ? ` @ ${e.location}` : ""}`;
      });

    const nameById = Object.fromEntries(members.map((m) => [m.id, m.name]));
    const recentPosts = posts.slice(0, 10).map((p) => {
      const text = (p.transcript || p.body).slice(0, 140);
      return `${nameById[p.authorId] ?? "Someone"}: ${text}`;
    });

    const context: AssistantContext = {
      familyName: family.name,
      inviteCode: family.inviteCode,
      memberNames: members.map((m) => m.name),
      upcomingEvents,
      recentPosts,
      path: body.path,
      postingAs: member.name,
    };

    const demo = await isDemoMode();
    const result = await runFamilyAssistant({
      message: body.message?.trim() || (body.confirm ? "confirm" : ""),
      history: Array.isArray(body.history) ? body.history : [],
      context,
      confirm: body.confirm,
      runtime: {
        familyId,
        memberId: member.id,
        members,
        events,
        anchor: calendarAnchor(demo),
      },
    });

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Assistant unavailable.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
