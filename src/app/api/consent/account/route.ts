import { getAccountConsent, setAccountConsent } from "@/lib/consent-server";
import { getAuthUser } from "@/lib/auth";
import type { FamilyCallFrequency } from "@/lib/family-call-frequency";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to view consent." }, { status: 401 });
  }
  const consent = await getAccountConsent();
  return NextResponse.json(consent);
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to update consent." }, { status: 401 });
  }
  try {
    const body = (await req.json()) as {
      termsAccepted?: boolean;
      healthcareConsent?: boolean;
      familyCallFrequency?: FamilyCallFrequency;
    };
    const consent = await setAccountConsent({
      termsAccepted: body.termsAccepted,
      healthcareConsent: body.healthcareConsent,
      familyCallFrequency: body.familyCallFrequency,
    });
    return NextResponse.json(consent);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update consent." },
      { status: 400 },
    );
  }
}
