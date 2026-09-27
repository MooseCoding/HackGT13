"use client";

/** Browser helper: ElevenLabs via /api/tts, then Web Speech API fallback. */

let currentAudio: HTMLAudioElement | null = null;
let objectUrl: string | null = null;
let cancelled = false;

export function stopSpeaking() {
  cancelled = true;
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
}

function speakBrowser(text: string, rate = 0.9): Promise<"browser"> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve("browser");
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    u.onend = () => resolve("browser");
    u.onerror = () => resolve("browser");
    window.speechSynthesis.speak(u);
  });
}

async function speakChunkElevenLabs(text: string): Promise<boolean> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) return false;
  const blob = await res.blob();
  if (cancelled) return true;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(blob);
  const audio = new Audio(objectUrl);
  currentAudio = audio;
  await new Promise<void>((resolve, reject) => {
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error("audio playback failed"));
    void audio.play().catch(reject);
  });
  return true;
}

/** Sentence-aware chunking for long Family Radio scripts. */
function chunkText(text: string, maxChars = 2400): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxChars) return [cleaned];
  const parts: string[] = [];
  let remaining = cleaned;
  while (remaining.length > maxChars) {
    let cut = remaining.lastIndexOf(". ", maxChars);
    if (cut < maxChars * 0.4) cut = remaining.lastIndexOf(" ", maxChars);
    if (cut < 1) cut = maxChars;
    const end = remaining[cut] === "." ? cut + 1 : cut;
    parts.push(remaining.slice(0, end).trim());
    remaining = remaining.slice(end).trim();
  }
  if (remaining) parts.push(remaining);
  return parts.filter(Boolean);
}

/**
 * Speak text with ElevenLabs when configured; otherwise browser TTS.
 * Returns which provider actually played.
 */
export async function speakText(
  text: string,
  opts?: { rate?: number },
): Promise<"elevenlabs" | "browser"> {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "browser";

  stopSpeaking();
  cancelled = false;
  const rate = opts?.rate ?? 0.9;
  const chunks = chunkText(cleaned);

  try {
    for (const chunk of chunks) {
      if (cancelled) return "elevenlabs";
      const ok = await speakChunkElevenLabs(chunk);
      if (!ok) {
        // Fall back for the remainder as one browser utterance.
        if (!cancelled) await speakBrowser(chunks.slice(chunks.indexOf(chunk)).join(" "), rate);
        return "browser";
      }
    }
    return "elevenlabs";
  } catch {
    if (!cancelled) await speakBrowser(cleaned, rate);
    return "browser";
  } finally {
    currentAudio = null;
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
  }
}
