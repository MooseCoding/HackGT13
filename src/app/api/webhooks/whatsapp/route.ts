import { addPostRow, allMembers } from "@/lib/data";
import {
  acknowledgeWhatsAppMessage,
  extractWhatsAppMessages,
  normalizeWhatsAppMessage,
  patientForWhatsAppNumber,
  verifyWhatsAppSignature,
} from "@/lib/clinical/whatsapp";
import type { Post } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ error: "Webhook verification failed." }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifyWhatsAppSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const messages = extractWhatsAppMessages(payload);
  const members = await allMembers();
  const results: Array<{ messageId?: string; status: string }> = [];
  for (const message of messages) {
    try {
      const normalized = await normalizeWhatsAppMessage(message);
      if (!normalized) {
        results.push({ messageId: message.id, status: "unsupported" });
        continue;
      }
      const memberId = patientForWhatsAppNumber(normalized.from);
      const member = members.find((candidate) => candidate.id === memberId);
      if (!member?.clinicalOptIn) {
        results.push({ messageId: normalized.externalId, status: "not_opted_in" });
        continue;
      }
      const post: Post = {
        id: `wa-${normalized.externalId}`,
        familyId: member.familyId,
        authorId: member.id,
        kind: normalized.kind,
        body: normalized.kind === "voice" ? "WhatsApp voice note" : normalized.text,
        transcript: normalized.kind === "voice" ? normalized.text : undefined,
        createdAt: normalized.createdAt,
        channel: "whatsapp",
        externalMessageId: normalized.externalId,
        audioMetrics: normalized.audioMetrics,
        rawRetained: false,
      };
      await addPostRow(post);
      await acknowledgeWhatsAppMessage(normalized.from);
      results.push({ messageId: normalized.externalId, status: "analyzed" });
    } catch (error) {
      const duplicate = error instanceof Error && /duplicate|unique/i.test(error.message);
      results.push({ messageId: message.id, status: duplicate ? "duplicate" : "failed" });
    }
  }
  return NextResponse.json({ received: messages.length, results });
}
