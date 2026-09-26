import { digestFor } from "@/lib/store";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const familyId = req.nextUrl.searchParams.get("familyId") || "alvarez";
  const refresh = req.nextUrl.searchParams.get("refresh") === "1";
  const digest = digestFor(familyId, refresh);
  return NextResponse.json(digest);
}
