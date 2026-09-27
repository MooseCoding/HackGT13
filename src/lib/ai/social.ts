import type { LifeStoryPrompt, Member, Post } from "../types";
import { isDemoMode } from "../mode-server";
import { demoLifeStoryPrompts } from "../social-demo";
import { localLifeStoryPrompts } from "../social-prompts";
import { aiConfigured, groqConfigured } from "./config";
import { aiChat } from "./chat";
import { groqChat, parseModelJson } from "./groq";
import { LIFE_STORY_SYSTEM_PROMPT, MUTUAL_AID_SYSTEM_PROMPT } from "./prompts";

function memberName(members: Member[], id: string) {
  return members.find((m) => m.id === id)?.name.split(" ")[0] ?? "Someone";
}

function buildChatPayload(posts: Post[], members: Member[]) {
  const lines = posts
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 35)
    .map((p) => {
      const who = memberName(members, p.authorId);
      return `- ${who}: ${(p.transcript || p.body).slice(0, 220)}`;
    });
  const roster = members.map((m) => `${m.name} (${m.role}, age ${m.age})`).join("; ");
  return [`Family: ${roster}`, "", "Recent chat:", lines.length ? lines.join("\n") : "(empty)"].join("\n");
}

export async function aiLifeStoryPrompts(posts: Post[], members: Member[]): Promise<LifeStoryPrompt[] | null> {
  if (!aiConfigured()) return null;
  try {
    const { content, source } = await aiChat({
      json: true,
      temperature: 0.65,
      maxTokens: 600,
      messages: [
        { role: "system", content: LIFE_STORY_SYSTEM_PROMPT },
        { role: "user", content: buildChatPayload(posts, members) },
      ],
    });
    const parsed = parseModelJson<{
      prompts?: Array<{
        forMemberName?: string;
        aboutMemberName?: string;
        prompt?: string;
        reason?: string;
      }>;
    }>(content);

    const byFirst = Object.fromEntries(members.map((m) => [m.name.split(" ")[0].toLowerCase(), m]));
    const out: LifeStoryPrompt[] = [];
    let i = 0;
    for (const row of parsed.prompts ?? []) {
      const forMember = byFirst[row.forMemberName?.toLowerCase() ?? ""];
      const aboutMember = byFirst[row.aboutMemberName?.toLowerCase() ?? ""];
      const prompt = row.prompt?.trim();
      if (!forMember || !prompt) continue;
      out.push({
        id: `lp-${source}-${++i}`,
        forMemberId: forMember.id,
        forMemberName: forMember.name.split(" ")[0],
        aboutMemberId: aboutMember?.id,
        aboutMemberName: aboutMember?.name.split(" ")[0],
        prompt,
        reason: row.reason?.trim(),
      });
    }
    return out.length ? out.slice(0, 3) : null;
  } catch (err) {
    console.error("AI life story prompts failed; using local fallback.", err);
    return null;
  }
}

/** @deprecated Use `aiLifeStoryPrompts` */
export const groqLifeStoryPrompts = aiLifeStoryPrompts;

export async function groqMutualAidTask(text: string): Promise<{ task: string; reason: string } | null> {
  if (!groqConfigured()) return null;
  try {
    const raw = await groqChat({
      json: true,
      temperature: 0.2,
      maxTokens: 200,
      messages: [
        { role: "system", content: MUTUAL_AID_SYSTEM_PROMPT },
        { role: "user", content: text.slice(0, 400) },
      ],
    });
    const parsed = parseModelJson<{ isLocalAssistance?: boolean; task?: string; reason?: string }>(raw);
    if (!parsed.isLocalAssistance || !parsed.task?.trim()) return null;
    return { task: parsed.task.trim(), reason: parsed.reason?.trim() || "Local assistance request" };
  } catch {
    return null;
  }
}

export async function buildLifeStoryPrompts(posts: Post[], members: Member[]): Promise<LifeStoryPrompt[]> {
  if (await isDemoMode()) {
    const familyId = members[0]?.familyId;
    return familyId ? demoLifeStoryPrompts(familyId) : localLifeStoryPrompts(posts, members);
  }
  const ai = await aiLifeStoryPrompts(posts, members);
  if (ai?.length) return ai;
  return localLifeStoryPrompts(posts, members);
}
