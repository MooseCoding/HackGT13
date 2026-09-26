import { now } from "@/lib/clock";
import { addPostRow, membersOf, postsForThread, postsOf } from "@/lib/data";
import { isDemoMode } from "@/lib/mode-server";
import type { Post, PostKind } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const familyId = req.nextUrl.searchParams.get("familyId") || "alvarez";
  const threadId = req.nextUrl.searchParams.get("threadId");
  const posts = threadId ? await postsForThread(familyId, threadId) : await postsOf(familyId);
  return NextResponse.json({ posts, members: await membersOf(familyId) });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<Post> & { authorId: string; familyId: string };
  const post: Post = {
    id: `p-${Date.now()}`,
    familyId: body.familyId,
    authorId: body.authorId,
    kind: (body.kind as PostKind) || "text",
    body: body.body || "",
    createdAt: (await isDemoMode()) ? now() : new Date().toISOString(),
    photoUrl: body.photoUrl,
    photoAlt: body.photoAlt,
    voiceSeconds: body.voiceSeconds,
    transcript: body.transcript,
    threadId: body.threadId,
  };
  return NextResponse.json(await addPostRow(post));
}
