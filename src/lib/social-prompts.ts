import { scoreTopics } from "./local-ml";
import type { LifeStoryPrompt, Member, Post } from "./types";

function firstName(member: Member) {
  return member.name.split(" ")[0];
}

function isElder(member: Member) {
  return member.age >= 65 || Boolean(member.easyModeDefault);
}

function isYounger(member: Member) {
  return member.age <= 25;
}

function recentTexts(posts: Post[], limit = 40) {
  return posts
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map((p) => ({ post: p, text: (p.transcript || p.body).trim() }))
    .filter((x) => x.text.length > 4);
}

function postsByMember(recent: ReturnType<typeof recentTexts>, memberId: string) {
  return recent.filter((r) => r.post.authorId === memberId);
}

function pickInterestSnippet(texts: string[]): string | null {
  const joined = texts.join(" ").toLowerCase();
  if (/car|engine|garage|mustang|chevy/.test(joined)) return "cars";
  if (/garden|tomato|basil|porch|yard/.test(joined)) return "the garden";
  if (/cook|recipe|kitchen|salsa|beans|stew|jollof|dinner|lunch/.test(joined)) return "cooking";
  if (/exam|biology|school|class|campus|study|midterm|lab/.test(joined)) return "school";
  if (/soccer|game|coach|sport|tournament|scarf/.test(joined)) return "sports";
  if (/book|novel|club|choir|music|radio/.test(joined)) return "books and music";
  if (/photo|album|picture|selfie/.test(joined)) return "family photos";
  if (/hackathon|college|campus|teleport|empanada/.test(joined)) return "being away at school";
  if (/walk|beltline|neighborhood|porch/.test(joined)) return "neighborhood walks";
  if (/job|work|office|retired/.test(joined)) return "work";
  return null;
}

function isMiddleGen(member: Member) {
  return member.age >= 35 && member.age <= 60;
}

/** Warm prompts that work even when chat is quiet - one per eligible member. */
function baselinePrompts(members: Member[]): LifeStoryPrompt[] {
  const elders = members.filter(isElder);
  const young = members.filter(isYounger);
  const middle = members.filter(isMiddleGen);
  const prompts: LifeStoryPrompt[] = [];
  let id = 0;

  for (const elder of elders) {
    const grandchild = young.find((y) => y.familyId === elder.familyId);
    const parent = middle.find((m) => m.familyId === elder.familyId);
    if (grandchild) {
      prompts.push({
        id: `lp-base-${++id}`,
        forMemberId: grandchild.id,
        forMemberName: firstName(grandchild),
        aboutMemberId: elder.id,
        aboutMemberName: firstName(elder),
        prompt: `Ask ${firstName(elder)} what made them laugh this week - a small moment counts.`,
        reason: "A light check-in. That's it.",
      });
    }
    if (parent) {
      prompts.push({
        id: `lp-base-${++id}`,
        forMemberId: parent.id,
        forMemberName: firstName(parent),
        aboutMemberId: elder.id,
        aboutMemberName: firstName(elder),
        prompt: `Plan a quick call with ${firstName(elder)} - even ten minutes on the porch phone helps.`,
        reason: "Small calls still count when people live far apart.",
      });
    }
  }

  for (const kid of young) {
    const elder = elders.find((e) => e.familyId === kid.familyId);
    if (!elder) continue;
    prompts.push({
      id: `lp-base-${++id}`,
      forMemberId: kid.id,
      forMemberName: firstName(kid),
      aboutMemberId: elder.id,
      aboutMemberName: firstName(elder),
      prompt: `Share one thing from your week ${firstName(elder)} would enjoy hearing about.`,
      reason: "Younger voices help everyone stay in the loop.",
    });
  }

  return prompts;
}

/** Local fallback - keyword-driven intergenerational prompts. */
export function localLifeStoryPrompts(posts: Post[], members: Member[]): LifeStoryPrompt[] {
  const recent = recentTexts(posts);
  if (!recent.length) return [];

  const elders = members.filter(isElder);
  const young = members.filter(isYounger);
  const prompts: LifeStoryPrompt[] = [];
  let id = 0;

  for (const elder of elders) {
    const elderPosts = postsByMember(recent, elder.id).map((r) => r.text);
    const interest = pickInterestSnippet(elderPosts);
    const grandchild = young.find((y) => y.familyId === elder.familyId);
    if (grandchild && interest) {
      prompts.push({
        id: `lp-${++id}`,
        forMemberId: grandchild.id,
        forMemberName: firstName(grandchild),
        aboutMemberId: elder.id,
        aboutMemberName: firstName(elder),
        prompt: `Ask ${firstName(elder)} about ${interest === "cars" ? "his first job - he mentioned loving cars back then!" : `when ${interest} became important to them.`}`,
        reason: `Recent chat mentions ${interest}.`,
      });
    }
  }

  for (const kid of young) {
    const kidPosts = postsByMember(recent, kid.id).map((r) => r.text);
    const blob = kidPosts.join(" ").toLowerCase();
    const elder = elders.find((e) => e.familyId === kid.familyId);
    if (!elder) continue;

    if (/exam|test|biology|midterm|project|lab practical/.test(blob)) {
      prompts.push({
        id: `lp-${++id}`,
        forMemberId: elder.id,
        forMemberName: firstName(elder),
        aboutMemberId: kid.id,
        aboutMemberName: firstName(kid),
        prompt: `${firstName(kid)} posted about school lately - ask how it went!`,
        reason: "School came up in chat.",
      });
    }
    if (/game|soccer|match|tournament|won|score/.test(blob)) {
      prompts.push({
        id: `lp-${++id}`,
        forMemberId: elder.id,
        forMemberName: firstName(elder),
        aboutMemberId: kid.id,
        aboutMemberName: firstName(kid),
        prompt: `${firstName(kid)} had something on the calendar - ask about the game!`,
        reason: "Sports came up in chat.",
      });
    }
    if (/hackathon|campus|college|miss.*home|kitchen table/.test(blob)) {
      const parent = members.find((m) => isMiddleGen(m) && m.familyId === kid.familyId);
      if (parent) {
        prompts.push({
          id: `lp-${++id}`,
          forMemberId: parent.id,
          forMemberName: firstName(parent),
          aboutMemberId: kid.id,
          aboutMemberName: firstName(kid),
          prompt: `${firstName(kid)} mentioned missing home - send a photo from the kitchen table tonight.`,
          reason: "When people live far away, a photo still helps.",
        });
      }
    }
  }

  const allBlob = recent.map((r) => r.text).join(" ").toLowerCase();
  const middle = members.filter(isMiddleGen);

  if (/sunday|dinner|lunch|pick you up|calendar/.test(allBlob)) {
    for (const parent of middle) {
      const elder = elders.find((e) => e.familyId === parent.familyId);
      if (!elder) continue;
      prompts.push({
        id: `lp-${++id}`,
        forMemberId: parent.id,
        forMemberName: firstName(parent),
        aboutMemberId: elder.id,
        aboutMemberName: firstName(elder),
        prompt: `Sunday plans came up - confirm timing with ${firstName(elder)} so nobody hunts through messages.`,
        reason: "Sunday lunch is easier if the time is actually on the calendar.",
      });
    }
  }

  if (/recipe|salsa|stew|jollof|beans|tea|chamomile/.test(allBlob)) {
    for (const elder of elders) {
      const grandchild = young.find((y) => y.familyId === elder.familyId);
      if (!grandchild) continue;
      prompts.push({
        id: `lp-${++id}`,
        forMemberId: grandchild.id,
        forMemberName: firstName(grandchild),
        aboutMemberId: elder.id,
        aboutMemberName: firstName(elder),
        prompt: `Ask ${firstName(elder)} to share the recipe everyone still talks about.`,
        reason: "Food talk is an easy way into a longer story.",
      });
    }
  }

  if (/photo|album|mustang|harvest|porch/.test(allBlob)) {
    for (const kid of young) {
      const elder = elders.find((e) => e.familyId === kid.familyId);
      if (!elder) continue;
      prompts.push({
        id: `lp-${++id}`,
        forMemberId: kid.id,
        forMemberName: firstName(kid),
        aboutMemberId: elder.id,
        aboutMemberName: firstName(elder),
        prompt: `Someone shared a photo - ask ${firstName(elder)} who else was in the room that day.`,
        reason: "Photos usually get people talking.",
      });
    }
  }

  if (/book|novel|club|choir|beltline|walk/.test(allBlob)) {
    for (const elder of elders) {
      const parent = middle.find((m) => m.familyId === elder.familyId);
      if (!parent) continue;
      prompts.push({
        id: `lp-${++id}`,
        forMemberId: parent.id,
        forMemberName: firstName(parent),
        aboutMemberId: elder.id,
        aboutMemberName: firstName(elder),
        prompt: `${firstName(elder)} mentioned a group or walk - ask how it went and who showed up.`,
        reason: "Ask how it went. People like being asked.",
      });
    }
  }

  if (/remote|tv|shelf|chair|pick.*up|nearby/.test(allBlob)) {
    for (const parent of middle) {
      const elder = elders.find((e) => e.familyId === parent.familyId && e.id !== parent.id);
      if (!elder) continue;
      prompts.push({
        id: `lp-${++id}`,
        forMemberId: parent.id,
        forMemberName: firstName(parent),
        aboutMemberId: elder.id,
        aboutMemberName: firstName(elder),
        prompt: `${firstName(elder)} asked for a small favor - follow up and offer a visit if you can.`,
        reason: "Practical help is how families show up.",
      });
    }
  }

  const memoryTopic = scoreTopics(recent.map((r) => r.text));
  if (memoryTopic.some((t) => t.topic === "memory") && elders[0] && young[0]) {
    prompts.push({
      id: `lp-${++id}`,
      forMemberId: young[0].id,
      forMemberName: firstName(young[0]),
      aboutMemberId: elders[0].id,
      aboutMemberName: firstName(elders[0]),
      prompt: `Someone shared a memory this week - ask ${firstName(elders[0])} to tell the longer version.`,
      reason: "Memory theme in recent posts.",
    });
  }

  if (prompts.length < 4) {
    prompts.push(...baselinePrompts(members));
  }

  const seen = new Set<string>();
  return prompts
    .filter((p) => {
      const key = `${p.forMemberId}:${p.prompt.slice(0, 40)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}
