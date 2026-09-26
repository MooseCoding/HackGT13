import { now } from "@/lib/clock";
import { addPostRow, membersOf, postingIdentity, postsForThread, postsOf, resolveFamilyId } from "@/lib/data";
import { isDemoMode } from "@/lib/mode-server";
import { suggestScheduleFromText } from "@/lib/schedule-detect";
import type { Post, PostKind } from "@/lib/types";
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
    };
    const saved = await addPostRow(post);
    const members = await membersOf(identity.familyId);
    const scheduleSuggestion = suggestScheduleFromText(
      post.transcript || post.body,
      members,
    );
    return NextResponse.json({ ...saved, scheduleSuggestion });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create post." },
      { status: 403 },
    );
  }
}
