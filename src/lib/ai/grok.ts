import { grokApiBase, grokApiKey, grokConfigured, grokModel } from "./config";
import type { AiChatOptions } from "./chat-types";

export class GrokError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "GrokError";
  }
}

/** Low-level Grok chat completions transport. */
export async function grokChat(options: AiChatOptions): Promise<string> {
  if (!grokConfigured()) throw new GrokError("GROK_API_KEY is not set.");

  const res = await fetch(`${grokApiBase()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${grokApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model || grokModel(),
      messages: options.messages,
      temperature: options.temperature ?? 0.6,
      max_tokens: options.maxTokens ?? 700,
      ...(options.reasoningEffort ? { reasoning_effort: options.reasoningEffort } : {}),
      ...(options.json ? { response_format: { type: "json_object" } } : {}),
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GrokError(`Grok ${res.status}: ${body.slice(0, 280)}`, res.status);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new GrokError("Grok returned an empty response.");
  return content;
}
