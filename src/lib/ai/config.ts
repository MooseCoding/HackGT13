/** Groq OpenAI-compatible API — https://console.groq.com */

export function groqConfigured() {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

export function groqModel() {
  return process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b";
}

export function groqApiBase() {
  return (process.env.GROQ_API_BASE?.trim() || "https://api.groq.com/openai/v1").replace(/\/$/, "");
}
