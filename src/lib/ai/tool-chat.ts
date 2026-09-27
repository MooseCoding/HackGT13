import { groqApiBase, groqConfigured, groqModel, museApiBase, museApiKey, museConfigured, museModel } from "./config";
import type { AiSource } from "./chat";

export type ToolDef = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type ChatMessage =
  | { role: "system" | "user" | "assistant"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls: ToolCall[];
    }
  | { role: "tool"; tool_call_id: string; content: string };

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type ToolChatResult = {
  source: AiSource;
  content: string | null;
  toolCalls: ToolCall[];
  rawAssistant: ChatMessage;
};

async function postChat(options: {
  base: string;
  key: string;
  model: string;
  messages: ChatMessage[];
  tools: ToolDef[];
  temperature?: number;
  maxTokens?: number;
}): Promise<ToolChatResult["rawAssistant"] & { content: string | null; tool_calls?: ToolCall[] }> {
  const res = await fetch(`${options.base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      tools: options.tools,
      tool_choice: "auto",
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 700,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Tool chat ${res.status}: ${body.slice(0, 280)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { role?: string; content?: string | null; tool_calls?: ToolCall[] } }>;
  };
  const message = data.choices?.[0]?.message;
  if (!message) throw new Error("Tool chat returned no message.");
  return {
    role: "assistant" as const,
    content: message.content ?? null,
    tool_calls: message.tool_calls ?? [],
  };
}

/** OpenAI-compatible tool calling via Muse, then Groq. */
export async function aiChatWithTools(options: {
  messages: ChatMessage[];
  tools: ToolDef[];
  temperature?: number;
  maxTokens?: number;
}): Promise<ToolChatResult> {
  if (museConfigured()) {
    try {
      const message = await postChat({
        base: museApiBase(),
        key: museApiKey(),
        model: museModel(),
        messages: options.messages,
        tools: options.tools,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      });
      return {
        source: "muse",
        content: message.content,
        toolCalls: message.tool_calls ?? [],
        rawAssistant: message.tool_calls?.length
          ? { role: "assistant", content: message.content, tool_calls: message.tool_calls }
          : { role: "assistant", content: message.content ?? "" },
      };
    } catch (error) {
      console.error("Muse tool chat failed; trying Groq.", error);
      if (!groqConfigured()) throw error;
    }
  }

  if (!groqConfigured()) throw new Error("No AI provider configured for tools.");

  const message = await postChat({
    base: groqApiBase(),
    key: process.env.GROQ_API_KEY!,
    model: groqModel(),
    messages: options.messages,
    tools: options.tools,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
  });
  return {
    source: "groq",
    content: message.content,
    toolCalls: message.tool_calls ?? [],
    rawAssistant: message.tool_calls?.length
      ? { role: "assistant", content: message.content, tool_calls: message.tool_calls }
      : { role: "assistant", content: message.content ?? "" },
  };
}
