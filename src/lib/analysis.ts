import { DEMO_NOW } from "./clock";
import { hourOf, lexicalDiversity, meanSentenceLength, repetitionScore, sentimentScore } from "./nlp";
import type { ClinicalFlag, DailyPoint, PatientSnapshot, Post } from "./types";

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

  const flags: ClinicalFlag[] = [];
  if (lexDelta <= -0.15 || sentLenDelta <= -0.2 || rep >= 0.25) {
    flags.push({
      code: "cognitive_change",
      severity: lexDelta <= -0.22 || rep >= 0.4 ? "high" : "elevated",
      title: "Cognitive language shift vs personal baseline",
      detail: `Lexical diversity ${Math.round(lexDelta * 100)}% vs prior 30 days. Mean sentence length ${Math.round(sentLenDelta * 100)}%. Conversational repetition score ${Math.round(rep * 100)}%.`,
    });
  }
  if (engDelta <= -0.25 || sentDelta <= -0.15) {
    flags.push({
      code: "mood_isolation",
      severity: engDelta <= -0.4 ? "high" : "elevated",
      title: "Engagement and affect change",
      detail: `Weekly posts ${Math.round(engDelta * 100)}% vs baseline. Sentiment shifted ${sentDelta.toFixed(2)} on a −1 to 1 scale.`,
    });
  }
  if (mornDelta <= -0.15 || night >= 0.35) {
    flags.push({
      code: "sleep_shift",
      severity: night >= 0.45 ? "high" : "watch",
      title: "Temporal pattern / sundowning watch",
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
}) {
  if (!s.flags.length) {
    return "No material deviation from this patient's 30-day personal baseline. Language richness, posting cadence, and diurnal pattern remain stable. Continue routine follow-up.";
  }
  const parts = [
    `Patient demonstrates a ${Math.abs(Math.round(s.lexDelta * 100))}% ${s.lexDelta < 0 ? "reduction" : "increase"} in lexical diversity over the last 14 days versus their prior 30-day baseline, with mean sentence length ${s.sentLen.toFixed(1)} words (${Math.round(s.sentLenDelta * 100)}%).`,
    `Repetition of short phrases is ${Math.round(s.rep * 100)}% of recent utterances. Morning activity share is ${Math.round(s.morn * 100)}%; ${Math.round(s.night * 100)}% of posts occur after 10pm.`,
    s.flags.some((f) => f.code === "cognitive_change")
      ? "Pattern is consistent with a watch for mild cognitive change (word-finding / perseveration). This is decision support, not a diagnosis."
      : "Mood and circadian signals warrant clinical review between office visits.",
  ];
  return parts.join(" ");
}
