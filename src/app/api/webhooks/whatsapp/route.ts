import { addPostRow, allMembers } from "@/lib/data";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
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

type IntakeMember = { id: string; familyId: string; clinicalOptIn: boolean };

/**
 * The webhook has no user session, so in production it reads and writes with the
 * service role after the Meta signature check. Without a service key (local dev)
 * it falls back to the session-scoped data layer.
 */
const hasServiceRole = () => Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

async function intakeMember(memberId: string | null): Promise<IntakeMember | null> {
  if (!memberId) return null;
  if (!hasServiceRole()) {
    return (await allMembers()).find((candidate) => candidate.id === memberId) ?? null;
  }
  const { data, error } = await createSupabaseAdmin()
    .from("members")
    .select("id, family_id, clinical_opt_in")
    .eq("id", memberId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { id: data.id, familyId: data.family_id, clinicalOptIn: data.clinical_opt_in } : null;
}

async function saveIntakePost(post: Post) {
  if (!hasServiceRole()) {
    await addPostRow(post);
    return;
  }
  const { error } = await createSupabaseAdmin().from("posts").insert({
    id: post.id,
    family_id: post.familyId,
    author_id: post.authorId,
    kind: post.kind,
    body: post.body,
    created_at: post.createdAt,
    voice_seconds: post.voiceSeconds ?? null,
    transcript: post.transcript ?? null,
    source_channel: post.channel ?? "whatsapp",
    external_message_id: post.externalMessageId ?? null,
    audio_metrics: post.audioMetrics ?? null,
    raw_retained: post.rawRetained ?? false,
  });
  if (error) throw new Error(error.message);
}

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
  const results: Array<{ messageId?: string; status: string }> = [];
  for (const message of messages) {
    try {
      const normalized = await normalizeWhatsAppMessage(message);
      if (!normalized) {
        results.push({ messageId: message.id, status: "unsupported" });
        continue;
      }
      const memberId = patientForWhatsAppNumber(normalized.from);
      const member = await intakeMember(memberId);
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
      await saveIntakePost(post);
      await acknowledgeWhatsAppMessage(normalized.from);
      results.push({ messageId: normalized.externalId, status: "analyzed" });
    } catch (error) {
      const duplicate = error instanceof Error && /duplicate|unique/i.test(error.message);
      results.push({ messageId: message.id, status: duplicate ? "duplicate" : "failed" });
    }
  }
  return NextResponse.json({ received: messages.length, results });
}
