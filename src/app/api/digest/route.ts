import { digestFor, resolveFamilyId } from "@/lib/data";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const familyId = req.nextUrl.searchParams.get("familyId") || (await resolveFamilyId());
  const refresh = req.nextUrl.searchParams.get("refresh") === "1";
  const digest = await digestFor(familyId, refresh);
  return NextResponse.json(digest);
}
