import { DEMO_NOW } from "./clock";
import { rankContextClues } from "./local-ml";
import { hourOf, lexicalDiversity, meanSentenceLength, repetitionScore, sentimentScore } from "./nlp";
import type { ClinicalFlag, DailyPoint, ExplainableInsight, PatientSnapshot, Post } from "./types";

function textOf(p: Post) {
  return p.transcript || p.body;
}

function inRange(posts: Post[], start: Date, end: Date) {
  return posts.filter((p) => {
    const t = new Date(p.createdAt);
    return t >= start && t < end;
  });
}

function joined(posts: Post[]) {
  return posts.map(textOf).join(" ");
}

function pctDelta(current: number, baseline: number) {
  if (baseline === 0) return current === 0 ? 0 : 1;
  return (current - baseline) / Math.abs(baseline);
}

function morningShare(posts: Post[]) {
  if (!posts.length) return 0;
  return posts.filter((p) => {
    const h = hourOf(p.createdAt);
    return h >= 6 && h < 12;
  }).length / posts.length;
}

function nightShare(posts: Post[]) {
  if (!posts.length) return 0;
  return posts.filter((p) => {
    const h = hourOf(p.createdAt);
    return h >= 22 || h < 5;
  }).length / posts.length;
}

function dateOnly(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function explainActivity(
  current: Post[],
  baseline: Post[],
  windowStart: Date,
  baselineStart: Date,
  baselineEnd: Date,
): ExplainableInsight {
  const ranges = {
    currentRange: { start: dateOnly(windowStart), end: dateOnly(DEMO_NOW) },
    baselineRange: {
      start: dateOnly(baselineStart),
      end: dateOnly(new Date(baselineEnd.getTime() - 24 * 60 * 60 * 1000)),
    },
  };
  if (current.length < 3 || baseline.length < 4) {
    return {
      status: "insufficient_data",
      title: "Insufficient data for a comparison",
      summary: `Hearth needs at least 3 recent posts and 4 baseline posts. It currently has ${current.length} recent and ${baseline.length} baseline posts.`,
      currentLabel: `${current.length} recent post${current.length === 1 ? "" : "s"}`,
      baselineLabel: `${baseline.length} baseline post${baseline.length === 1 ? "" : "s"}`,
      ...ranges,
      evidence: [],
    };
  }

  const currentNight = current.filter((p) => {
    const hour = hourOf(p.createdAt);
    return hour >= 22 || hour < 5;
  });
  const baselineNight = baseline.filter((p) => {
    const hour = hourOf(p.createdAt);
    return hour >= 22 || hour < 5;
  });
  const currentNightPct = Math.round((currentNight.length / current.length) * 100);
  const baselineNightPct = Math.round((baselineNight.length / baseline.length) * 100);
  const currentWeekly = current.length / 2;
  const baselineWeekly = baseline.length / (30 / 7);
  const useNight = Math.abs(currentNightPct - baselineNightPct) >= 20;
  const pool = useNight ? currentNight : current;
  const clues = rankContextClues(pool, 5);
  const clueMap = new Map(clues.map((c) => [c.postId, c]));
  const evidencePosts =
    clues.length > 0
      ? pool.filter((p) => clueMap.has(p.id)).sort((a, b) => clueMap.get(b.id)!.score - clueMap.get(a.id)!.score)
      : pool.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return {
    status: "ready",
    title: useNight
      ? `Late-night activity changed from ${baselineNightPct}% to ${currentNightPct}%`
      : `Posts per week changed from ${baselineWeekly.toFixed(1)} to ${currentWeekly.toFixed(1)}`,
    summary: useNight
      ? `${currentNight.length} of ${current.length} recent posts were sent from 10pm–5am, compared with ${baselineNight.length} of ${baseline.length} in the baseline period.`
      : `${current.length} posts in the recent 14-day window are compared with ${baseline.length} posts in the prior 30 days, normalized per week.`,
    currentLabel: useNight
      ? `${currentNightPct}% late-night (${currentNight.length}/${current.length})`
      : `${currentWeekly.toFixed(1)} posts/week`,
    baselineLabel: useNight
      ? `${baselineNightPct}% late-night (${baselineNight.length}/${baseline.length})`
      : `${baselineWeekly.toFixed(1)} posts/week`,
    ...ranges,
    evidence: evidencePosts.map((post) => ({
      postId: post.id,
      createdAt: post.createdAt,
      text: textOf(post),
      tags: clueMap.get(post.id)?.tags,
    })),
  };
}

function seriesFor(posts: Post[], days: number): DailyPoint[] {
  const points: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(DEMO_NOW);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const slice = inRange(posts, day, next);
    const blob = joined(slice);
    points.push({
      date: day.toISOString().slice(0, 10),
      posts: slice.length,
      lexicalDiversity: slice.length ? lexicalDiversity(blob) : 0,
      meanSentenceLength: slice.length ? meanSentenceLength(blob) : 0,
      sentiment: slice.length ? sentimentScore(blob) : 0,
      nightPosts: slice.filter((p) => {
        const h = hourOf(p.createdAt);
        return h >= 22 || h < 5;
      }).length,
    });
  }
  return points;
}

export function analyzeMember(memberId: string, posts: Post[]): PatientSnapshot {
  const mine = posts
    .filter((p) => p.authorId === memberId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const familyId = mine[0]?.familyId ?? "";
  const windowDays = 14;
  const baselineDays = 30;
  const windowStart = new Date(DEMO_NOW);
  windowStart.setDate(windowStart.getDate() - windowDays);
  const baselineEnd = new Date(windowStart);
  const baselineStart = new Date(baselineEnd);
  baselineStart.setDate(baselineStart.getDate() - baselineDays);

  const current = inRange(mine, windowStart, DEMO_NOW);
  const baseline = inRange(mine, baselineStart, baselineEnd);

  const curText = joined(current);
  const baseText = joined(baseline);

  const lex = lexicalDiversity(curText);
  const lexB = lexicalDiversity(baseText);
  const sentLen = meanSentenceLength(curText);
  const sentLenB = meanSentenceLength(baseText);
  const sent = sentimentScore(curText);
  const sentB = sentimentScore(baseText);
  const eng = current.length / 2;
  const engB = baseline.length / (baselineDays / 7);
  const morn = morningShare(current);
  const mornB = morningShare(baseline);
  const night = nightShare(current);
  const lexDelta = pctDelta(lex, lexB);
  const sentLenDelta = pctDelta(sentLen, sentLenB);
  const sentDelta = sent - sentB;
  const engDelta = pctDelta(eng, engB);
  const mornDelta = morn - mornB;
  const rep = repetitionScore(current.map(textOf));
  const insight = explainActivity(current, baseline, windowStart, baselineStart, baselineEnd);

  const flags: ClinicalFlag[] = [];
  if (insight.status === "ready" && engDelta <= -0.25) {
    flags.push({
      code: "engagement_change",
      severity: engDelta <= -0.4 ? "high" : "elevated",
      title: "Posting activity decreased",
      detail: `Weekly posts changed ${Math.round(engDelta * 100)}% versus this member's prior 30-day baseline.`,
    });
  }
  if (insight.status === "ready" && (mornDelta <= -0.15 || night >= 0.35)) {
    flags.push({
      code: "sleep_shift",
      severity: night >= 0.45 ? "high" : "watch",
      title: "Posting-time pattern changed",
      detail: `Morning activity share ${Math.round(morn * 100)}% (Δ ${Math.round(mornDelta * 100)} pts). Night posts ${Math.round(night * 100)}% of recent activity.`,
    });
  }

  const note = buildNote({
    lex,
    lexDelta,
    sentLen,
    sentLenDelta,
    eng,
    engDelta,
    morn,
    night,
    rep,
    sent,
    flags,
    insight,
  });

  return {
    memberId,
    familyId,
    windowDays,
    baselineDays,
    lexicalDiversity: lex,
    lexicalDiversityDelta: lexDelta,
    meanSentenceLength: sentLen,
    sentenceLengthDelta: sentLenDelta,
    repetitionScore: rep,
    sentiment: sent,
    sentimentDelta: sentDelta,
    engagementPerWeek: eng,
    engagementDelta: engDelta,
    morningShare: morn,
    morningShareDelta: mornDelta,
    nightShare: night,
    flags,
    insight,
    note,
    series: seriesFor(mine, 42),
  };
}

function buildNote(s: {
  lex: number;
  lexDelta: number;
  sentLen: number;
  sentLenDelta: number;
  eng: number;
  engDelta: number;
  morn: number;
  night: number;
  rep: number;
  sent: number;
  flags: ClinicalFlag[];
  insight: ExplainableInsight;
}) {
  if (s.insight.status === "insufficient_data") {
    return "There is not enough activity to compare the recent 14 days with the prior 30 days. No conclusion should be drawn from word choice or posting time.";
  }
  if (!s.flags.length) {
    return "No material change in posting cadence or time of day versus this member's prior 30-day baseline. These communication patterns are context for a conversation, not a diagnosis.";
  }
  const parts = [
    s.insight.summary,
    `Morning activity share is ${Math.round(s.morn * 100)}%; ${Math.round(s.night * 100)}% of recent posts occur from 10pm–5am.`,
    "This describes communication activity only. Word choice and posting patterns do not diagnose mental illness or cognitive disease.",
  ];
  return parts.join(" ");
}
