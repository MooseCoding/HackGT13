export type CheckInSuggestion = {
  title: string;
  message: string;
};

const CHECK_IN_PATTERNS = [
  /\bnot feeling (?:well|good|okay)\b/i,
  /\bfeeling (?:low|lonely|down|overwhelmed)\b/i,
  /\b(?:i am|i'm) (?:very )?(?:tired|lonely|confused|upset)\b/i,
  /\b(?:cannot|can't) (?:find|remember)\b/i,
  /\bi (?:forgot|feel lost)\b/i,
];

/** A humane one-message response. This never changes longitudinal clinical risk. */
export function detectCheckInSuggestion(text: string): CheckInSuggestion | null {
  const normalized = text.trim();
  if (!normalized || !CHECK_IN_PATTERNS.some((pattern) => pattern.test(normalized))) return null;
  return {
    title: "A gentle check-in may help",
    message: "One difficult message does not create a clinical alert. Consider asking someone in your circle to check in directly.",
  };
}
