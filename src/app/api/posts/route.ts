import { addPost, membersOf, postsOf } from "@/lib/store";
import type { Post, PostKind } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const familyId = req.nextUrl.searchParams.get("familyId") || "alvarez";
  return NextResponse.json({ posts: postsOf(familyId), members: membersOf(familyId) });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<Post> & { authorId: string; familyId: string };
  const post: Post = {
    id: `p-${Date.now()}`,
    familyId: body.familyId,
    authorId: body.authorId,
    kind: (body.kind as PostKind) || "text",
    body: body.body || "",
    createdAt: new Date().toISOString(),
    photoUrl: body.photoUrl,
    photoAlt: body.photoAlt,
    voiceSeconds: body.voiceSeconds,
    transcript: body.transcript,
  };
  addPost(post);
  return NextResponse.json(post);
}
