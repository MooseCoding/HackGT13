/**
 * Backboard (https://backboard.io) — persistent memory for Familyr Assistant only.
 *
 * Each circle gets one Backboard assistant, found by exact name
 * (`familyr-circle-<familyId>`), so no extra table is needed. Backboard memory
 * is scoped to that assistant and shared across its threads.
 *
 * Backboard is never a source of truth: Supabase stays authoritative for
 * members, events, reminders, permissions and clinical data. Everything here
 * is best-effort. When BACKBOARD_API_KEY is unset, or Backboard is slow or
 * down, the assistant behaves exactly as it did before.
 */

function apiBase() {
  return (process.env.BACKBOARD_API_BASE?.trim() || "https://app.backboard.io/api").replace(/\/$/, "");
}
const RECALL_TIMEOUT_MS = 2500;
const WRITE_TIMEOUT_MS = 8000;

const FACT_EXTRACTION_PROMPT = [
  "Extract durable, practical facts about this family that would help a scheduling and family-logistics assistant later:",
  "routines (e.g. 'Sofia has soccer every Saturday'), availability ('Mom works Thursdays'), preferences",
  "('Grandma prefers afternoon appointments'), and standing requests ('Dad wants a reminder before insurance renewal').",
  "Attribute each fact to the named person when known.",
  "Never extract health conditions, symptoms, diagnoses, medications, mental health, clinical or insurance details,",
  "passwords, codes, addresses, phone numbers, or anything said about children beyond scheduling.",
  "Skip one-off chatter and anything already obvious from a calendar entry.",
].join(" ");

type BackboardAssistant = { assistant_id: string; name: string };
type BackboardMemory = { id: string; content: string; score?: number };

const globalCache = globalThis as typeof globalThis & {
  __familyrBackboardAssistants?: Map<string, Promise<string>>;
  __familyrBackboardThreads?: Map<string, string>;
};

function assistantCache() {
  globalCache.__familyrBackboardAssistants ??= new Map();
  return globalCache.__familyrBackboardAssistants;
}

function threadCache() {
  globalCache.__familyrBackboardThreads ??= new Map();
  return globalCache.__familyrBackboardThreads;
}

export function backboardConfigured() {
  return Boolean(process.env.BACKBOARD_API_KEY?.trim());
}

async function backboard<T>(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs = WRITE_TIMEOUT_MS, ...rest } = init;
  const response = await fetch(`${apiBase()}${path}`, {
    ...rest,
    headers: {
      "X-API-Key": process.env.BACKBOARD_API_KEY?.trim() ?? "",
      "Content-Type": "application/json",
      ...(rest.headers ?? {}),
    },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Backboard ${response.status} on ${path}: ${detail.slice(0, 200)}`);
  }
  return (await response.json()) as T;
}

function assistantName(familyId: string) {
  return `familyr-circle-${familyId}`;
}

/** Finds (or creates once) the Backboard assistant that holds this circle's memory. */
async function circleAssistantId(familyId: string): Promise<string> {
  const cache = assistantCache();
  const cached = cache.get(familyId);
  if (cached) return cached;

  const pending = (async () => {
    const name = assistantName(familyId);
    const existing = await backboard<BackboardAssistant[]>(
      `/assistants?name=${encodeURIComponent(name)}&limit=1`,
      { method: "GET", timeoutMs: RECALL_TIMEOUT_MS },
    );
    if (Array.isArray(existing) && existing[0]?.assistant_id) return existing[0].assistant_id;
    const created = await backboard<BackboardAssistant>("/assistants", {
      method: "POST",
      body: JSON.stringify({
        name,
        system_prompt: "Memory store for the Familyr Assistant of one family circle.",
        custom_fact_extraction_prompt: FACT_EXTRACTION_PROMPT,
      }),
    });
    return created.assistant_id;
  })();

  cache.set(familyId, pending);
  pending.catch(() => cache.delete(familyId));
  return pending;
}

/**
 * Long-term notes relevant to this message, e.g. "Grandma prefers afternoon
 * appointments". Returns [] when Backboard is off, slow, or failing.
 */
export async function recallCircleMemory(familyId: string, query: string, limit = 6): Promise<string[]> {
  if (!backboardConfigured() || !query.trim()) return [];
  try {
    const assistantId = await circleAssistantId(familyId);
    const result = await backboard<{ memories?: BackboardMemory[] }>(
      `/assistants/${encodeURIComponent(assistantId)}/memories/search`,
      {
        method: "POST",
        body: JSON.stringify({ query: query.slice(0, 500), limit }),
        timeoutMs: RECALL_TIMEOUT_MS,
      },
    );
    return (result.memories ?? [])
      .map((memory) => memory.content?.trim())
      .filter((content): content is string => Boolean(content))
      .slice(0, limit);
  } catch (error) {
    console.warn("[backboard] recall skipped:", error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Saves what a member told the assistant so Backboard can extract durable
 * facts (memory: "Auto"). No reply is generated (send_to_llm: false); the
 * existing Muse/Grok layer still does all reasoning and tool calls.
 */
export async function rememberAssistantTurn(input: {
  familyId: string;
  memberId: string;
  memberName: string;
  message: string;
}): Promise<void> {
  const message = input.message.trim();
  if (!backboardConfigured() || message.length < 8) return;
  try {
    const assistantId = await circleAssistantId(input.familyId);
    const threadKey = `${input.familyId}:${input.memberId}`;
    const threadId = threadCache().get(threadKey);
    const saved = await backboard<{ thread_id?: string }>("/threads/messages", {
      method: "POST",
      body: JSON.stringify({
        assistant_id: assistantId,
        ...(threadId ? { thread_id: threadId } : {}),
        content: `${input.memberName}: ${message.slice(0, 2000)}`,
        memory: "Auto",
        send_to_llm: "false",
        metadata: { source: "familyr-assistant", memberId: input.memberId },
      }),
    });
    if (saved.thread_id) threadCache().set(threadKey, saved.thread_id);
  } catch (error) {
    console.warn("[backboard] remember skipped:", error instanceof Error ? error.message : error);
  }
}
