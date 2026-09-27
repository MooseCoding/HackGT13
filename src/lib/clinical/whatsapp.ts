import { createHmac, timingSafeEqual } from "node:crypto";
import { transcribeAudio } from "./audio";

type WhatsAppMessage = {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  audio?: { id?: string; mime_type?: string };
};

export function verifyWhatsAppSignature(rawBody: string, signature: string | null) {
  const secret = process.env.WHATSAPP_APP_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  if (!signature?.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"));
  const supplied = Buffer.from(signature.slice(7));
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export function extractWhatsAppMessages(payload: unknown): WhatsAppMessage[] {
  const body = payload as {
    entry?: Array<{ changes?: Array<{ value?: { messages?: WhatsAppMessage[] } }> }>;
  };
  return body.entry?.flatMap((entry) => entry.changes?.flatMap((change) => change.value?.messages ?? []) ?? []) ?? [];
}

export function patientForWhatsAppNumber(phone: string) {
  try {
    const map = JSON.parse(process.env.WHATSAPP_PATIENT_MAP || "{}") as Record<string, string>;
    return map[phone] || map[phone.replace(/\D/g, "")] || process.env.WHATSAPP_DEFAULT_MEMBER_ID || null;
  } catch {
    return process.env.WHATSAPP_DEFAULT_MEMBER_ID || null;
  }
}

async function downloadWhatsAppMedia(mediaId: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const version = process.env.WHATSAPP_GRAPH_VERSION || "v23.0";
  if (!token) throw new Error("WHATSAPP_ACCESS_TOKEN is not configured.");
  const metadata = await fetch(`https://graph.facebook.com/${version}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!metadata.ok) throw new Error(`Could not resolve WhatsApp media (${metadata.status}).`);
  const data = (await metadata.json()) as { url?: string; mime_type?: string };
  if (!data.url) throw new Error("WhatsApp media response did not include a URL.");
  const media = await fetch(data.url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!media.ok) throw new Error(`Could not download WhatsApp media (${media.status}).`);
  return { bytes: await media.arrayBuffer(), mimeType: data.mime_type || media.headers.get("content-type") || "audio/ogg" };
}

export async function normalizeWhatsAppMessage(message: WhatsAppMessage) {
  if (!message.id || !message.from) return null;
  if (message.type === "text" && message.text?.body) {
    return {
      externalId: message.id,
      from: message.from,
      createdAt: message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : new Date().toISOString(),
      kind: "text" as const,
      text: message.text.body,
    };
  }
  if (message.type === "audio" && message.audio?.id) {
    const media = await downloadWhatsAppMedia(message.audio.id);
    const result = await transcribeAudio({ bytes: media.bytes, mimeType: message.audio.mime_type || media.mimeType });
    return {
      externalId: message.id,
      from: message.from,
      createdAt: message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : new Date().toISOString(),
      kind: "voice" as const,
      text: result.transcript,
      audioMetrics: result.metrics,
    };
  }
  return null;
}

export async function acknowledgeWhatsAppMessage(to: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return;
  const version = process.env.WHATSAPP_GRAPH_VERSION || "v23.0";
  await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: "Familyr received your update. Your private message will be reduced to consented communication signals for your care team." },
    }),
    cache: "no-store",
  });
}
