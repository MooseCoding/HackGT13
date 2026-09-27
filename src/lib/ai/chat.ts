import { aiProviderMode, grokConfigured, museConfigured } from "./config";
import type { AiChatOptions } from "./chat-types";
import { grokChat } from "./grok";
import { museChat } from "./muse";

export type AiSource = "muse" | "grok";
export type { AiChatOptions } from "./chat-types";

/** Prefer Meta Muse when configured; fall back to Groq. Throws if neither is set. */
export async function aiChat(options: AiChatOptions): Promise<{ content: string; source: AiSource }> {
  if (aiProviderMode() !== "grok" && museConfigured()) {
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
      console.error("Meta Muse request failed; trying Grok fallback.", error);
      if (!grokConfigured()) throw error;
    }
  }

  if (grokConfigured()) {
    const content = await grokChat(options);
    return { content, source: "grok" };
  }

  throw new Error("No AI provider configured.");
}
