import { digestFor, requireFamilyAccess, resolveFamilyId } from "@/lib/data";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const familyId = req.nextUrl.searchParams.get("familyId") || (await resolveFamilyId());
  try {
    await requireFamilyAccess(familyId);
    const refresh = req.nextUrl.searchParams.get("refresh") === "1";
    const digest = await digestFor(familyId, refresh);
    return NextResponse.json(digest);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not load digest." },
      { status: 403 },
    );
  }
}
