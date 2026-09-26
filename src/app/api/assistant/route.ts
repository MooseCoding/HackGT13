import { runFamilyAssistant, type AssistantContext, type AssistantTurn } from "@/lib/ai/assistant";
import { eventsOf, familyById, membersOf, postsOf, resolveFamilyId } from "@/lib/data";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      message?: string;
      history?: AssistantTurn[];
      path?: string;
      familyId?: string;
    };
    const message = body.message?.trim() || "";
    if (!message) {
      return NextResponse.json({ error: "Say something first." }, { status: 400 });
    }

    const familyId = body.familyId || (await resolveFamilyId());
    const [family, members, events, posts] = await Promise.all([
      familyById(familyId),
      membersOf(familyId),
      eventsOf(familyId),
      postsOf(familyId),
    ]);

    const now = Date.now();
    const upcomingEvents = events
      .filter((e) => new Date(e.startsAt).getTime() >= now - 12 * 60 * 60 * 1000)
      .slice(0, 8)
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
    };

    const result = await runFamilyAssistant({
      message,
      history: Array.isArray(body.history) ? body.history : [],
      context,
    });

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Assistant unavailable.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
