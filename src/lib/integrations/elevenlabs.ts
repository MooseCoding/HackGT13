/** ElevenLabs — TTS (Family Radio / Listen) + STT (voice notes; Groq is fallback). */

const API_BASE = "https://api.elevenlabs.io/v1";
/** Warm default voice (George) from ElevenLabs docs. */
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const DEFAULT_TTS_MODEL = "eleven_multilingual_v2";
const DEFAULT_STT_MODEL = "scribe_v1";
/** Stay under typical plan character limits per TTS request. */
export const ELEVENLABS_MAX_CHARS = 2500;

export function elevenLabsConfigured() {
  return Boolean(process.env.ELEVENLABS_API_KEY?.trim());
}

export function elevenLabsVoiceId() {
  return process.env.ELEVENLABS_VOICE_ID?.trim() || DEFAULT_VOICE_ID;
}

export function elevenLabsModel() {
  return process.env.ELEVENLABS_MODEL_ID?.trim() || DEFAULT_TTS_MODEL;
}

export function elevenLabsSttModel() {
  return process.env.ELEVENLABS_STT_MODEL?.trim() || DEFAULT_STT_MODEL;
}

export function elevenLabsApiKey() {
  return process.env.ELEVENLABS_API_KEY?.trim() || "";
}

/** Split long narration into speakable chunks (sentence-aware). */
export function chunkForSpeech(text: string, maxChars = ELEVENLABS_MAX_CHARS): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxChars) return [cleaned];

  const parts: string[] = [];
  let remaining = cleaned;
  while (remaining.length > maxChars) {
    let cut = remaining.lastIndexOf(". ", maxChars);
    if (cut < maxChars * 0.4) cut = remaining.lastIndexOf(" ", maxChars);
    if (cut < 1) cut = maxChars;
    parts.push(remaining.slice(0, cut + (remaining[cut] === "." ? 1 : 0)).trim());
    remaining = remaining.slice(cut + (remaining[cut] === "." ? 1 : 0)).trim();
  }
  if (remaining) parts.push(remaining);
  return parts.filter(Boolean);
}

/** Synthesize MP3 bytes. Throws if the key is missing or ElevenLabs errors. */
export async function synthesizeSpeech(text: string): Promise<ArrayBuffer> {
  const key = elevenLabsApiKey();
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set.");

  const trimmed = text.replace(/\s+/g, " ").trim().slice(0, ELEVENLABS_MAX_CHARS);
  if (!trimmed) throw new Error("Nothing to speak.");

  const voiceId = elevenLabsVoiceId();
  const url = `${API_BASE}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": key,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: trimmed,
      model_id: elevenLabsModel(),
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs TTS ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.arrayBuffer();
}

export type ElevenLabsWord = {
  text?: string;
  start?: number;
  end?: number;
  type?: string;
};

export type ElevenLabsTranscript = {
  text: string;
  language_code?: string;
  words?: ElevenLabsWord[];
  durationSeconds: number;
};

/** Speech-to-text via Scribe. Throws if the key is missing or ElevenLabs errors. */
export async function transcribeSpeech(input: {
  bytes: ArrayBuffer;
  mimeType: string;
  fileName?: string;
}): Promise<ElevenLabsTranscript> {
  const key = elevenLabsApiKey();
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set.");

  const form = new FormData();
  form.set(
    "file",
    new Blob([input.bytes], { type: input.mimeType || "application/octet-stream" }),
    input.fileName || "voice-note.ogg",
  );
  form.set("model_id", elevenLabsSttModel());

  const res = await fetch(`${API_BASE}/speech-to-text`, {
    method: "POST",
    headers: { "xi-api-key": key },
    body: form,
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs STT ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    text?: string;
    language_code?: string;
    words?: ElevenLabsWord[];
  };
  const text = data.text?.trim();
  if (!text) throw new Error("ElevenLabs STT returned no text.");

  const words = data.words ?? [];
  const lastEnd = [...words].reverse().find((w) => typeof w.end === "number")?.end;
  return {
    text,
    language_code: data.language_code,
    words,
    durationSeconds: typeof lastEnd === "number" ? lastEnd : 0,
  };
}
