import { groqApiBase, groqConfigured, groqModel } from "./config";

export type GroqMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GroqChatOptions = {
  messages: GroqMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Force JSON object response when the model supports it. */
  json?: boolean;
  reasoningEffort?: "low" | "medium" | "high";
};

export class GroqError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "GroqError";
  }
}

/** Low-level Groq chat completions. Throws if unconfigured or HTTP error. */
export async function groqChat(options: GroqChatOptions): Promise<string> {
  if (!groqConfigured()) {
    throw new GroqError("GROQ_API_KEY is not set.");
  }

  const res = await fetch(`${groqApiBase()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model || groqModel(),
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
    throw new GroqError(`Groq ${res.status}: ${body.slice(0, 280)}`, res.status);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new GroqError("Groq returned an empty response.");
  return content;
}

/** Parse JSON from a model reply (strips optional ``` fences). */
export function parseModelJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned) as T;
}
