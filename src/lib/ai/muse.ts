import { museApiBase, museApiKey, museConfigured, museModel } from "./config";

export type MuseMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type MuseChatOptions = {
  messages: MuseMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Force JSON object response when the model supports it. */
  json?: boolean;
  reasoningEffort?: "minimal" | "low" | "medium" | "high" | "xhigh";
};

export class MuseError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "MuseError";
  }
}

/** Low-level Meta Model API chat completions. Throws if unconfigured or HTTP error. */
export async function museChat(options: MuseChatOptions): Promise<string> {
  if (!museConfigured()) {
    throw new MuseError("MODEL_API_KEY is not set.");
  }

  const res = await fetch(`${museApiBase()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${museApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model || museModel(),
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
    throw new MuseError(`Muse ${res.status}: ${body.slice(0, 280)}`, res.status);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new MuseError("Muse returned an empty response.");
  return content;
}
