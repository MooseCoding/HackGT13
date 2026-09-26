import { setMemberInsurance } from "@/lib/data";
import { isDemoMode } from "@/lib/mode-server";
import type { MemberInsurance } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

function parseInsurance(body: Record<string, unknown>): MemberInsurance | null {
  if (body.insurance === null) return null;
  const insurance = body.insurance;
  if (!insurance || typeof insurance !== "object" || Array.isArray(insurance)) {
    throw new Error("Insurance details are required.");
  }
  const carrierId = (insurance as { carrierId?: unknown }).carrierId;
  if (typeof carrierId !== "string" || !carrierId.trim()) {
    throw new Error("Choose an insurance carrier.");
  }
  const policyMemberId = (insurance as { policyMemberId?: unknown }).policyMemberId;
  const groupId = (insurance as { groupId?: unknown }).groupId;
  return {
    carrierId: carrierId.trim(),
    policyMemberId: typeof policyMemberId === "string" && policyMemberId.trim() ? policyMemberId.trim() : undefined,
    groupId: typeof groupId === "string" && groupId.trim() ? groupId.trim() : undefined,
  };
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as { memberId?: string; insurance?: unknown };
  if (!body.memberId) {
    return NextResponse.json({ error: "Member is required." }, { status: 400 });
  }
  try {
    const insurance = parseInsurance(body as Record<string, unknown>);
    const member = await setMemberInsurance(body.memberId, insurance);
    return NextResponse.json({ member });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update insurance.";
    const status = message.includes("Sign in") && !(await isDemoMode()) ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
