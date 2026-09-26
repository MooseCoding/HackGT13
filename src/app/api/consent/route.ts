import { setClinicalConsent } from "@/lib/data";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as { memberId?: string; enabled?: boolean };
  if (!body.memberId || typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Member and consent choice are required." }, { status: 400 });
  }
  try {
    const member = await setClinicalConsent(body.memberId, body.enabled);
    return NextResponse.json({ member });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update consent." },
      { status: 403 },
    );
  }
}
