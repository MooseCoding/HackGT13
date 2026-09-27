import { groqConfigured, museConfigured } from "./config";
import { groqChat, type GroqChatOptions } from "./groq";
import { museChat } from "./muse";

export type AiSource = "muse" | "groq";

export type AiChatOptions = GroqChatOptions;

/** Prefer Meta Muse when configured; fall back to Groq. Throws if neither is set. */
export async function aiChat(options: AiChatOptions): Promise<{ content: string; source: AiSource }> {
  if (museConfigured()) {
    try {
      const content = await museChat({
        messages: options.messages,
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        json: options.json,
        reasoningEffort: options.reasoningEffort,
      });
      return { content, source: "muse" };
    } catch (error) {
      console.error("Meta Muse request failed; trying Groq fallback.", error);
      if (!groqConfigured()) throw error;
    }
  }

  if (groqConfigured()) {
    const content = await groqChat(options);
    return { content, source: "groq" };
  }

  throw new Error("No AI provider configured.");
}
