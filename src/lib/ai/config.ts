/** Groq OpenAI-compatible API — https://console.groq.com */

export function groqConfigured() {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

export function groqModel() {
  return process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";
}

export function groqApiBase() {
  return (process.env.GROQ_API_BASE?.trim() || "https://api.groq.com/openai/v1").replace(/\/$/, "");
}
