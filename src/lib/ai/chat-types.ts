export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiChatOptions = {
  messages: AiMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  reasoningEffort?: "minimal" | "low" | "medium" | "high" | "xhigh";
};
