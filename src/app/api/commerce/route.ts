import { now } from "@/lib/clock";
import { membersOf, postingIdentity } from "@/lib/data";
import { suggestCommerceFromText } from "@/lib/commerce-detect";
import { isDemoMode } from "@/lib/mode-server";
import type { CommerceKind } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      familyId: string;
      authorId: string;
      recipientId: string;
      kind: CommerceKind;
      title: string;
      sourceText: string;
      sourcePostId?: string;
    };
    const identity = await postingIdentity(body.familyId, body.authorId);
    const members = await membersOf(identity.familyId);
    const recipient = members.find((m) => m.id === body.recipientId);
    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found." }, { status: 404 });
    }

    const suggestion = suggestCommerceFromText(body.sourceText, members, body.authorId);
    if (!suggestion) {
      return NextResponse.json({ error: "No orderable need detected." }, { status: 400 });
    }

    const demo = await isDemoMode();
    const orderedAt = demo ? now() : new Date().toISOString();
    const orderId = `ord-${Date.now()}`;
    const deliveryBy = body.kind === "care_package" ? "tomorrow by 6pm" : "Friday by 3pm";

    const address = recipient.street
      ? [recipient.street, recipient.city, recipient.state].filter(Boolean).join(", ")
      : recipient.location;

    return NextResponse.json({
      ok: true,
      demo: true,
      orderId,
      orderedAt,
      title: body.title,
      recipientName: recipient.name.split(" ")[0],
      deliveryAddress: address,
      estimatedDelivery: deliveryBy,
      message:
        body.kind === "care_package"
          ? `Demo only: care package would ship to ${recipient.name.split(" ")[0]} by ${deliveryBy}. No payment was taken.`
          : `Demo only: ${body.title} would arrive at ${address} by ${deliveryBy}. No payment was taken.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not place order." },
      { status: 403 },
    );
  }
}
