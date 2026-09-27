/** Groq Whisper — STT fallback when ElevenLabs is unset or fails. */

export function groqConfigured() {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

export function groqModel() {
  return process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-20b";
}

export function groqApiBase() {
  return (process.env.GROQ_API_BASE?.trim() || "https://api.groq.com/openai/v1").replace(/\/$/, "");
}

/** Grok generation fallback (OpenAI-compatible API). */
export function grokConfigured() {
  return Boolean(process.env.GROK_API_KEY?.trim() || process.env.XAI_API_KEY?.trim());
}

export function grokModel() {
  return process.env.GROK_MODEL?.trim() || process.env.XAI_MODEL?.trim() || "grok-4-fast-reasoning";
}

export function grokApiBase() {
  return (process.env.GROK_API_BASE?.trim() || process.env.XAI_API_BASE?.trim() || "https://api.x.ai/v1").replace(/\/$/, "");
}

export function grokApiKey() {
  return process.env.GROK_API_KEY?.trim() || process.env.XAI_API_KEY?.trim() || "";
}

export function aiProviderMode() {
  return process.env.AI_PROVIDER_MODE?.trim().toLowerCase() === "grok" ? "grok" : "auto";
}

/** Meta Model API (Muse Spark) — https://dev.meta.ai */

export function museConfigured() {
  return Boolean(
    process.env.MODEL_API_KEY?.trim() || process.env.MUSE_API_KEY?.trim(),
  );
}

export function museModel() {
  return process.env.AI_MODEL?.trim() || "muse-spark-1.3";
}

export function museApiBase() {
  return (process.env.AI_API_BASE?.trim() || "https://api.meta.ai/v1").replace(/\/$/, "");
}

export function museApiKey() {
  return process.env.MODEL_API_KEY?.trim() || process.env.MUSE_API_KEY?.trim() || "";
}

/** True when any cloud LLM is available for Hestia / assistant features. */
export function aiConfigured() {
  return museConfigured() || grokConfigured();
}
