import { setActiveFamily } from "@/lib/data";
import { FAMILY_COOKIE } from "@/lib/mode";
import { isDemoMode } from "@/lib/mode-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { familyId?: string };
  if (!body.familyId?.trim()) {
    return NextResponse.json({ error: "familyId is required." }, { status: 400 });
  }
  try {
    const { activeId } = await setActiveFamily(body.familyId.trim());
    const res = NextResponse.json({ activeId });
    if (await isDemoMode()) {
      res.cookies.set(FAMILY_COOKIE, activeId, {
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not switch family." },
      { status: 403 },
    );
  }
}
