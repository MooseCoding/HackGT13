import { DEMO_NOW } from "./clock";
import { rankContextClues } from "./local-ml";
import { hourOf, lexicalDiversity, meanSentenceLength, repetitionScore, sentimentScore } from "./nlp";
import type { ClinicalDomain, ClinicalFlag, DailyPoint, ExplainableInsight, PatientSnapshot, Post } from "./types";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function textOf(post: Post) {
  return post.transcript || post.body;
}

function inRange(posts: Post[], start: Date, end: Date) {
  return posts.filter((post) => {
    const time = new Date(post.createdAt);
    return time >= start && time < end;
  });
}

function joined(posts: Post[]) {
  return posts.map(textOf).join(" ");
}

function pctDelta(current: number, baseline: number) {
  if (baseline === 0) return current === 0 ? 0 : 1;
  return (current - baseline) / Math.abs(baseline);
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function shareDuring(posts: Post[], predicate: (hour: number) => boolean) {
  if (!posts.length) return 0;
  return posts.filter((post) => predicate(hourOf(post.createdAt))).length / posts.length;
}

function morningShare(posts: Post[]) {
  return shareDuring(posts, (hour) => hour >= 6 && hour < 12);
}

function nightShare(posts: Post[]) {
  return shareDuring(posts, (hour) => hour >= 22 || hour < 5);
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function affectRange(posts: Post[]) {
  return standardDeviation(posts.map((post) => sentimentScore(textOf(post))));
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function voiceSummary(posts: Post[]) {
  const metrics = posts.flatMap((post) => (post.audioMetrics ? [post.audioMetrics] : []));
  return {
    samples: metrics.length,
    wordsPerMinute: average(metrics.map((metric) => metric.wordsPerMinute)),
    pauseRatio: average(metrics.map((metric) => metric.pauseRatio)),
    hesitationRate: average(metrics.map((metric) => metric.hesitationRate)),
  };
}

/** Median time to reply after another family member in the same conversation. */
function responseLatency(memberId: string, familyPosts: Post[], start: Date, end: Date) {
  const ordered = familyPosts
    .filter((post) => new Date(post.createdAt) >= new Date(start.getTime() - 3 * DAY) && new Date(post.createdAt) < end)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const responseHours: number[] = [];
  for (let index = 1; index < ordered.length; index += 1) {
    const post = ordered[index];
    const previous = ordered[index - 1];
    if (post.authorId !== memberId || previous.authorId === memberId) continue;
    if ((post.threadId ?? "group") !== (previous.threadId ?? "group")) continue;
    const sentAt = new Date(post.createdAt);
    if (sentAt < start || sentAt >= end) continue;
    const value = (sentAt.getTime() - new Date(previous.createdAt).getTime()) / HOUR;
    if (value >= 0 && value <= 72) responseHours.push(value);
  }
  return median(responseHours);
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

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function decimal(value: number) {
  return value.toFixed(2);
}

function explainActivity(
  current: Post[],
  baseline: Post[],
  windowStart: Date,
  baselineStart: Date,
  baselineEnd: Date,
  referenceDate: Date,
): ExplainableInsight {
  const ranges = {
    currentRange: { start: dateOnly(windowStart), end: dateOnly(referenceDate) },
    baselineRange: {
      start: dateOnly(baselineStart),
      end: dateOnly(new Date(baselineEnd.getTime() - DAY)),
    },
  };
  if (current.length < 3 || baseline.length < 4) {
    return {
      status: "insufficient_data",
      title: "More observations are needed",
      summary: `The agent needs at least 3 recent and 4 baseline interactions. It currently has ${current.length} recent and ${baseline.length} baseline interactions.`,
      currentLabel: `${current.length} recent interaction${current.length === 1 ? "" : "s"}`,
      baselineLabel: `${baseline.length} baseline interaction${baseline.length === 1 ? "" : "s"}`,
      ...ranges,
      evidence: [],
    };
  }

  const currentNight = current.filter((post) => {
    const hour = hourOf(post.createdAt);
    return hour >= 22 || hour < 5;
  });
  const baselineNight = baseline.filter((post) => {
    const hour = hourOf(post.createdAt);
    return hour >= 22 || hour < 5;
  });
  const currentNightPct = Math.round((currentNight.length / current.length) * 100);
  const baselineNightPct = Math.round((baselineNight.length / baseline.length) * 100);
  const currentWeekly = current.length / 2;
  const baselineWeekly = baseline.length / (30 / 7);
  const useNight = Math.abs(currentNightPct - baselineNightPct) >= 20;
  const pool = useNight ? currentNight : current;
  const clues = rankContextClues(pool, 4);
  const clueMap = new Map(clues.map((clue) => [clue.postId, clue]));
  const evidencePosts = clues.length
    ? pool.filter((post) => clueMap.has(post.id)).sort((a, b) => clueMap.get(b.id)!.score - clueMap.get(a.id)!.score)
    : pool.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);

  return {
    status: "ready",
    title: useNight
      ? `Late-night activity changed from ${baselineNightPct}% to ${currentNightPct}%`
      : `Weekly engagement changed from ${baselineWeekly.toFixed(1)} to ${currentWeekly.toFixed(1)}`,
    summary: useNight
      ? `${currentNight.length} of ${current.length} recent interactions occurred from 10 PM–5 AM, compared with ${baselineNight.length} of ${baseline.length} during baseline.`
      : `${current.length} interactions in the recent 14-day window were compared with ${baseline.length} in the prior 30 days and normalized per week.`,
    currentLabel: useNight
      ? `${currentNightPct}% late-night (${currentNight.length}/${current.length})`
      : `${currentWeekly.toFixed(1)} interactions/week`,
    baselineLabel: useNight
      ? `${baselineNightPct}% late-night (${baselineNight.length}/${baseline.length})`
      : `${baselineWeekly.toFixed(1)} interactions/week`,
    ...ranges,
    evidence: evidencePosts.map((post) => ({
      postId: post.id,
      createdAt: post.createdAt,
      text: textOf(post),
      tags: clueMap.get(post.id)?.tags,
    })),
  };
}

function seriesFor(posts: Post[], days: number, referenceDate: Date): DailyPoint[] {
  const points: DailyPoint[] = [];
  for (let index = days - 1; index >= 0; index -= 1) {
    const day = new Date(referenceDate);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - index);
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
      nightPosts: slice.filter((post) => {
        const hour = hourOf(post.createdAt);
        return hour >= 22 || hour < 5;
      }).length,
      repetition: slice.length ? repetitionScore(slice.map(textOf)) : 0,
    });
  }
  return points;
}

function domainScore(adverseSignals: number[]) {
  return Math.round(clamp(100 - adverseSignals.reduce((sum, value) => sum + Math.max(0, value), 0)));
}

function domainTrend(flags: ClinicalFlag[], domain: ClinicalFlag["domain"]): ClinicalDomain["trend"] {
  const matching = flags.filter((flag) => flag.domain === domain);
  if (matching.some((flag) => flag.severity === "high" || flag.severity === "elevated")) return "changed";
  if (matching.length) return "watch";
  return "stable";
}

export function analyzeMember(memberId: string, familyPosts: Post[], referenceDate = DEMO_NOW): PatientSnapshot {
  const mine = familyPosts
    .filter((post) => post.authorId === memberId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const familyId = mine[0]?.familyId ?? "";
  const windowDays = 14;
  const baselineDays = 30;
  const windowStart = new Date(referenceDate);
  windowStart.setDate(windowStart.getDate() - windowDays);
  const baselineEnd = new Date(windowStart);
  const baselineStart = new Date(baselineEnd);
  baselineStart.setDate(baselineStart.getDate() - baselineDays);

  const current = inRange(mine, windowStart, referenceDate);
  const baseline = inRange(mine, baselineStart, baselineEnd);
  const currentText = joined(current);
  const baselineText = joined(baseline);
  const lex = lexicalDiversity(currentText);
  const lexBaseline = lexicalDiversity(baselineText);
  const sentenceLength = meanSentenceLength(currentText);
  const sentenceLengthBaseline = meanSentenceLength(baselineText);
  const sentiment = sentimentScore(currentText);
  const sentimentBaseline = sentimentScore(baselineText);
  const engagement = current.length / 2;
  const engagementBaseline = baseline.length / (baselineDays / 7);
  const morning = morningShare(current);
  const morningBaseline = morningShare(baseline);
  const night = nightShare(current);
  const nightBaseline = nightShare(baseline);
  const repetition = repetitionScore(current.map(textOf));
  const repetitionBaseline = repetitionScore(baseline.map(textOf));
  const currentAffectRange = affectRange(current);
  const baselineAffectRange = affectRange(baseline);
  const responseHours = responseLatency(memberId, familyPosts, windowStart, referenceDate);
  const responseHoursBaseline = responseLatency(memberId, familyPosts, baselineStart, baselineEnd);
  const currentVoice = voiceSummary(current);
  const baselineVoice = voiceSummary(baseline);

  const lexDelta = pctDelta(lex, lexBaseline);
  const sentenceLengthDelta = pctDelta(sentenceLength, sentenceLengthBaseline);
  const sentimentDelta = sentiment - sentimentBaseline;
  const engagementDelta = pctDelta(engagement, engagementBaseline);
  const morningDelta = morning - morningBaseline;
  const repetitionDelta = repetition - repetitionBaseline;
  const responseLatencyDelta =
    responseHours === null || responseHoursBaseline === null ? null : pctDelta(responseHours, responseHoursBaseline);
  const insight = explainActivity(current, baseline, windowStart, baselineStart, baselineEnd, referenceDate);
  const ready = insight.status === "ready";
  const flags: ClinicalFlag[] = [];

  if (ready && lexDelta <= -0.16) {
    flags.push({
      code: "lexical_change",
      domain: "cognitive",
      severity: lexDelta <= -0.25 ? "high" : "elevated",
      title: "Vocabulary variety contracted",
      detail: `Lexical diversity is ${Math.abs(Math.round(lexDelta * 100))}% below this member's personal baseline.`,
      current: decimal(lex),
      baseline: decimal(lexBaseline),
    });
  }
  if (ready && sentenceLengthDelta <= -0.2) {
    flags.push({
      code: "syntax_change",
      domain: "cognitive",
      severity: sentenceLengthDelta <= -0.35 ? "high" : "elevated",
      title: "Sentence structure simplified",
      detail: `Average sentence length declined ${Math.abs(Math.round(sentenceLengthDelta * 100))}% versus baseline.`,
      current: `${sentenceLength.toFixed(1)} words`,
      baseline: `${sentenceLengthBaseline.toFixed(1)} words`,
    });
  }
  if (ready && repetitionDelta >= 0.15) {
    flags.push({
      code: "repetition_change",
      domain: "cognitive",
      severity: repetitionDelta >= 0.3 ? "high" : "elevated",
      title: "Conversational repetition increased",
      detail: `Repeated or near-duplicate phrases increased ${Math.round(repetitionDelta * 100)} points versus baseline.`,
      current: percent(repetition),
      baseline: percent(repetitionBaseline),
    });
  }
  if (ready && engagementDelta <= -0.25) {
    flags.push({
      code: "engagement_change",
      domain: "social",
      severity: engagementDelta <= -0.4 ? "high" : "elevated",
      title: "Family engagement decreased",
      detail: `Weekly interaction frequency is ${Math.abs(Math.round(engagementDelta * 100))}% below this member's baseline.`,
      current: `${engagement.toFixed(1)}/week`,
      baseline: `${engagementBaseline.toFixed(1)}/week`,
    });
  }
  if (ready && (morningDelta <= -0.15 || night - nightBaseline >= 0.2)) {
    flags.push({
      code: "sleep_shift",
      domain: "social",
      severity: night - nightBaseline >= 0.35 ? "high" : "watch",
      title: "Activity timing shifted",
      detail: `Morning share changed ${Math.round(morningDelta * 100)} points; late-night share changed ${Math.round((night - nightBaseline) * 100)} points.`,
      current: `${percent(morning)} morning · ${percent(night)} night`,
      baseline: `${percent(morningBaseline)} morning · ${percent(nightBaseline)} night`,
    });
  }
  const affectRangeDelta = pctDelta(currentAffectRange, baselineAffectRange);
  if (ready && (sentimentDelta <= -0.2 || (baselineAffectRange > 0.08 && affectRangeDelta <= -0.4))) {
    flags.push({
      code: "affect_change",
      domain: "affect",
      severity: sentimentDelta <= -0.35 ? "high" : "elevated",
      title: sentimentDelta <= -0.2 ? "Emotional tone shifted negative" : "Emotional range narrowed",
      detail: `Sentiment changed ${sentimentDelta >= 0 ? "+" : ""}${sentimentDelta.toFixed(2)} and affect variability changed ${Math.round(affectRangeDelta * 100)}% versus baseline.`,
      current: `${sentiment.toFixed(2)} tone · ${currentAffectRange.toFixed(2)} range`,
      baseline: `${sentimentBaseline.toFixed(2)} tone · ${baselineAffectRange.toFixed(2)} range`,
    });
  }
  const speechRateDelta =
    currentVoice.wordsPerMinute === null || baselineVoice.wordsPerMinute === null
      ? null
      : pctDelta(currentVoice.wordsPerMinute, baselineVoice.wordsPerMinute);
  const pauseDelta =
    currentVoice.pauseRatio === null || baselineVoice.pauseRatio === null
      ? null
      : currentVoice.pauseRatio - baselineVoice.pauseRatio;
  if (ready && (speechRateDelta !== null && speechRateDelta <= -0.2 || pauseDelta !== null && pauseDelta >= 0.15)) {
    flags.push({
      code: "voice_change",
      domain: "cognitive",
      severity: (speechRateDelta ?? 0) <= -0.35 || (pauseDelta ?? 0) >= 0.3 ? "high" : "elevated",
      title: "Voice fluency pattern changed",
      detail: `Speech pace changed ${speechRateDelta === null ? "n/a" : `${Math.round(speechRateDelta * 100)}%`} and pause share changed ${pauseDelta === null ? "n/a" : `${Math.round(pauseDelta * 100)} points`} versus baseline.`,
      current: `${currentVoice.wordsPerMinute?.toFixed(0) ?? "—"} wpm · ${percent(currentVoice.pauseRatio ?? 0)} pauses`,
      baseline: `${baselineVoice.wordsPerMinute?.toFixed(0) ?? "—"} wpm · ${percent(baselineVoice.pauseRatio ?? 0)} pauses`,
    });
  }

  const cognitiveScore = domainScore([
    -lexDelta * 95,
    -sentenceLengthDelta * 55,
    repetitionDelta * 100,
    -Math.min(0, speechRateDelta ?? 0) * 30,
    Math.max(0, pauseDelta ?? 0) * 40,
  ]);
  const socialScore = domainScore([
    -engagementDelta * 75,
    Math.max(0, night - nightBaseline) * 65,
    Math.max(0, responseLatencyDelta ?? 0) * 20,
  ]);
  const affectScore = domainScore([-sentimentDelta * 70, -Math.min(0, affectRangeDelta) * 35]);
  const domains: ClinicalDomain[] = [
    {
      key: "cognitive",
      label: "Cognitive communication",
      score: cognitiveScore,
      trend: domainTrend(flags, "cognitive"),
      description: "Vocabulary, sentence structure, and repetition",
    },
    {
      key: "social",
      label: "Social engagement",
      score: socialScore,
      trend: domainTrend(flags, "social"),
      description: "Interaction cadence, response time, and daily rhythm",
    },
    {
      key: "affect",
      label: "Emotional stability",
      score: affectScore,
      trend: domainTrend(flags, "affect"),
      description: "Emotional tone and range over time",
    },
  ];
  const riskLevel = !ready
    ? "stable"
    : flags.some((flag) => flag.severity === "high") || flags.length >= 3
      ? "priority"
      : flags.length
        ? "monitor"
        : "stable";
  const totalSample = current.length + baseline.length;
  const confidence = totalSample >= 18 ? "high" : totalSample >= 8 ? "moderate" : "low";
  const nextStep = riskLevel === "priority"
    ? "Review the longitudinal trend and consider a brief cognitive and mood screen at the next clinical touchpoint."
    : riskLevel === "monitor"
      ? "Continue passive monitoring and confirm the change with the patient or caregiver if it persists."
      : ready
        ? "No outreach is suggested; continue routine passive monitoring."
        : "Wait for more consented interactions before interpreting the signal.";

  return {
    memberId,
    familyId,
    windowDays,
    baselineDays,
    lexicalDiversity: lex,
    lexicalDiversityBaseline: lexBaseline,
    lexicalDiversityDelta: lexDelta,
    meanSentenceLength: sentenceLength,
    meanSentenceLengthBaseline: sentenceLengthBaseline,
    sentenceLengthDelta,
    repetitionScore: repetition,
    repetitionBaseline,
    repetitionDelta,
    sentiment,
    sentimentBaseline,
    sentimentDelta,
    affectRange: currentAffectRange,
    affectRangeBaseline: baselineAffectRange,
    engagementPerWeek: engagement,
    engagementBaseline,
    engagementDelta,
    morningShare: morning,
    morningShareBaseline: morningBaseline,
    morningShareDelta: morningDelta,
    nightShare: night,
    nightShareBaseline: nightBaseline,
    responseHours,
    responseHoursBaseline,
    responseLatencyDelta,
    voice: {
      currentSamples: currentVoice.samples,
      baselineSamples: baselineVoice.samples,
      wordsPerMinute: currentVoice.wordsPerMinute,
      wordsPerMinuteBaseline: baselineVoice.wordsPerMinute,
      pauseRatio: currentVoice.pauseRatio,
      pauseRatioBaseline: baselineVoice.pauseRatio,
      hesitationRate: currentVoice.hesitationRate,
      hesitationRateBaseline: baselineVoice.hesitationRate,
    },
    riskLevel,
    confidence,
    currentSampleSize: current.length,
    baselineSampleSize: baseline.length,
    domains,
    assessedAt: referenceDate.toISOString(),
    nextStep,
    flags,
    insight,
    note: buildNote(flags, insight, nextStep),
    series: seriesFor(mine, 42, referenceDate),
  };
}

function buildNote(flags: ClinicalFlag[], insight: ExplainableInsight, nextStep: string) {
  if (insight.status === "insufficient_data") {
    return "Insufficient longitudinal activity for baseline comparison. No clinical interpretation was generated.";
  }
  if (!flags.length) {
    return "No material change was detected across communication, engagement, or emotional-pattern signals versus this member's personal baseline. Continue routine monitoring.";
  }
  const severity = { high: 3, elevated: 2, watch: 1 } as const;
  const leading = flags
    .slice()
    .sort((a, b) => severity[b.severity] - severity[a.severity])
    .slice(0, 3)
    .map((flag) => flag.detail.replace(/\.$/, "").toLowerCase());
  return `The latest 14-day window shows ${leading.join("; ")}. ${nextStep} This is a screening signal from consented interaction metadata, not a diagnosis.`;
}
