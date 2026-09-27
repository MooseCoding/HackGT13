import { groqApiBase, groqConfigured } from "@/lib/ai/config";
import { elevenLabsConfigured, transcribeSpeech } from "@/lib/integrations/elevenlabs";
import type { AudioMetrics } from "@/lib/types";

type Segment = { start?: number; end?: number; text?: string };
type TranscriptionResponse = { text?: string; duration?: number; segments?: Segment[] };

function round(value: number, digits = 2) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function transcriptHesitationRate(text: string) {
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  if (!words.length) return 0;
  const fillers = words.filter((word) => ["um", "uh", "erm", "hmm", "like"].includes(word)).length;
  const restarts = (text.match(/\b([a-z']+)\s+\1\b/gi) ?? []).length;
  return (fillers + restarts) / words.length;
}

export function deriveAudioMetrics(text: string, durationSeconds: number, segments: Segment[] = []): AudioMetrics {
  const words = text.match(/[A-Za-z0-9']+/g)?.length ?? 0;
  const ordered = segments
    .filter((segment) => typeof segment.start === "number" && typeof segment.end === "number")
    .sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
  const pauses: number[] = [];
  for (let index = 1; index < ordered.length; index += 1) {
    const pause = (ordered[index].start ?? 0) - (ordered[index - 1].end ?? 0);
    if (pause >= 0.35) pauses.push(pause);
  }
  const totalPause = pauses.reduce((sum, pause) => sum + pause, 0);
  return {
    durationSeconds: round(durationSeconds, 1),
    wordsPerMinute: round(durationSeconds > 0 ? (words / durationSeconds) * 60 : 0, 0),
    pauseRatio: round(durationSeconds > 0 ? totalPause / durationSeconds : 0),
    averagePauseSeconds: round(pauses.length ? totalPause / pauses.length : 0),
    hesitationRate: round(transcriptHesitationRate(text)),
  };
}

async function transcribeWithGroq(input: {
  bytes: ArrayBuffer;
  mimeType: string;
  fileName?: string;
}): Promise<{ transcript: string; metrics: AudioMetrics; provider: "groq" }> {
  if (!groqConfigured()) throw new Error("GROQ_API_KEY is required for Groq voice fallback.");
  const form = new FormData();
  form.set("file", new Blob([input.bytes], { type: input.mimeType }), input.fileName || "voice-note.ogg");
  form.set("model", process.env.GROQ_TRANSCRIPTION_MODEL?.trim() || "whisper-large-v3-turbo");
  form.set("response_format", "verbose_json");
  form.set("temperature", "0");
  const response = await fetch(`${groqApiBase()}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: form,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Groq voice transcription failed (${response.status}).`);
  const result = (await response.json()) as TranscriptionResponse;
  const transcript = result.text?.trim();
  if (!transcript) throw new Error("Groq voice transcription returned no text.");
  const duration = result.duration ?? result.segments?.at(-1)?.end ?? 0;
  return { transcript, metrics: deriveAudioMetrics(transcript, duration, result.segments), provider: "groq" };
}

async function transcribeWithElevenLabs(input: {
  bytes: ArrayBuffer;
  mimeType: string;
  fileName?: string;
}): Promise<{ transcript: string; metrics: AudioMetrics; provider: "elevenlabs" }> {
  const result = await transcribeSpeech(input);
  const segments: Segment[] = (result.words ?? [])
    .filter((w) => w.type !== "spacing")
    .map((w) => ({ start: w.start, end: w.end, text: w.text }));
  return {
    transcript: result.text,
    metrics: deriveAudioMetrics(result.text, result.durationSeconds, segments),
    provider: "elevenlabs",
  };
}

/**
 * Transcribe a voice note. Prefers ElevenLabs Scribe; falls back to Groq Whisper.
 */
export async function transcribeAudio(input: {
  bytes: ArrayBuffer;
  mimeType: string;
  fileName?: string;
}): Promise<{ transcript: string; metrics: AudioMetrics; provider?: "elevenlabs" | "groq" }> {
  if (elevenLabsConfigured()) {
    try {
      return await transcribeWithElevenLabs(input);
    } catch (error) {
      console.error("ElevenLabs STT failed; trying Groq Whisper fallback.", error);
      if (!groqConfigured()) throw error;
    }
  }

  if (groqConfigured()) {
    return transcribeWithGroq(input);
  }

  throw new Error("Set ELEVENLABS_API_KEY (preferred) or GROQ_API_KEY for voice transcription.");
}
