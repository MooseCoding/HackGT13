import { membersOf, postingIdentity, postsOf } from "@/lib/data";
import { buildLifeStoryPrompts } from "@/lib/ai/social";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const familyId = req.nextUrl.searchParams.get("familyId");
  const memberId = req.nextUrl.searchParams.get("memberId");
  if (!familyId || !memberId) {
    return NextResponse.json({ error: "familyId and memberId required." }, { status: 400 });
  }

  try {
    await postingIdentity(familyId, memberId);
    const [posts, members] = await Promise.all([postsOf(familyId), membersOf(familyId)]);
    const prompts = await buildLifeStoryPrompts(posts, members);
    return NextResponse.json({ prompts });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load prompts." },
      { status: 403 },
    );
  }
}
