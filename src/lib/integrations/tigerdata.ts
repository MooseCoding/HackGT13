/**
 * TigerData (Timescale) — time-series store for clinical communication metrics.
 *
 * Responsibilities are deliberately narrow:
 *   - store one row per metric per message for opted-in members only
 *   - aggregate recent 14-day vs previous 30-day averages
 *   - serve daily trend points for the clinician chart
 *
 * Supabase stays authoritative for snapshots, alerts, assignments and reports.
 * The existing engine in analysis.ts still decides flags and risk; TigerData's
 * aggregates are attached to each snapshot as an independent, queryable record.
 * When TIGERDATA_DATABASE_URL is unset, nothing here runs.
 */
import pg from "pg";
import { hourOf, lexicalDiversity, meanSentenceLength, sentimentScore } from "../nlp";
import type { DailyPoint, MetricComparison, Post, TimeseriesSummary } from "../types";

export const WINDOW_DAYS = 14;
export const BASELINE_DAYS = 30;

export type MetricName =
  | "word_count"
  | "lexical_diversity"
  | "sentence_length"
  | "sentiment"
  | "hour_of_day"
  | "night_post"
  | "morning_post"
  | "voice_words_per_minute"
  | "voice_pause_ratio"
  | "voice_hesitation_rate";

const SCHEMA_SQL = `
create table if not exists clinical_metrics (
  member_id      text             not null,
  measured_at    timestamptz      not null,
  metric_name    text             not null,
  metric_value   double precision not null,
  source_channel text             not null default 'hearth',
  post_id        text             not null,
  metadata       jsonb            not null default '{}'::jsonb
);
create unique index if not exists clinical_metrics_dedupe_idx
  on clinical_metrics (member_id, post_id, metric_name, measured_at);
create index if not exists clinical_metrics_member_metric_time_idx
  on clinical_metrics (member_id, metric_name, measured_at desc);
`;

const globalTiger = globalThis as typeof globalThis & {
  __familyrTigerPool?: pg.Pool;
  __familyrTigerSchema?: Promise<void>;
};

export function tigerdataConfigured() {
  return Boolean(process.env.TIGERDATA_DATABASE_URL?.trim());
}

function tigerConnectionString() {
  const raw = process.env.TIGERDATA_DATABASE_URL?.trim();
  if (!raw) return undefined;
  const url = new URL(raw);
  url.searchParams.set(
    "sslmode",
    process.env.TIGERDATA_SSL === "disable" ? "disable" : "verify-full",
  );
  return url.toString();
}

function pool() {
  if (!globalTiger.__familyrTigerPool) {
    globalTiger.__familyrTigerPool = new pg.Pool({
      connectionString: tigerConnectionString(),
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return globalTiger.__familyrTigerPool;
}

/** Creates the table (and hypertable, when TimescaleDB is present) once per process. */
function ensureSchema() {
  globalTiger.__familyrTigerSchema ??= (async () => {
    const client = await pool().connect();
    try {
      await client.query(SCHEMA_SQL);
      try {
        await client.query(
          "select create_hypertable('clinical_metrics', by_range('measured_at'), if_not_exists => true)",
        );
      } catch (error) {
        console.warn("[tigerdata] hypertable not created (plain Postgres?):", error instanceof Error ? error.message : error);
      }
    } finally {
      client.release();
    }
  })().catch((error) => {
    globalTiger.__familyrTigerSchema = undefined;
    throw error;
  });
  return globalTiger.__familyrTigerSchema;
}

type MetricRow = {
  memberId: string;
  measuredAt: string;
  metric: MetricName;
  value: number;
  channel: string;
  postId: string;
};

/** Per-message features, using the same NLP helpers as the clinical engine. */
export function metricsForPost(post: Post): MetricRow[] {
  const text = (post.transcript || post.body || "").trim();
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const hour = hourOf(post.createdAt);
  const base = { memberId: post.authorId, measuredAt: post.createdAt, channel: post.channel ?? "hearth", postId: post.id };
  const rows: MetricRow[] = [
    { ...base, metric: "word_count", value: words },
    { ...base, metric: "hour_of_day", value: hour },
    { ...base, metric: "night_post", value: hour >= 22 || hour < 5 ? 1 : 0 },
    { ...base, metric: "morning_post", value: hour >= 6 && hour < 12 ? 1 : 0 },
  ];
  if (words >= 4) {
    rows.push(
      { ...base, metric: "lexical_diversity", value: lexicalDiversity(text) },
      { ...base, metric: "sentence_length", value: meanSentenceLength(text) },
      { ...base, metric: "sentiment", value: sentimentScore(text) },
    );
  }
  if (post.audioMetrics) {
    rows.push(
      { ...base, metric: "voice_words_per_minute", value: post.audioMetrics.wordsPerMinute },
      { ...base, metric: "voice_pause_ratio", value: post.audioMetrics.pauseRatio },
      { ...base, metric: "voice_hesitation_rate", value: post.audioMetrics.hesitationRate },
    );
  }
  return rows.filter((row) => Number.isFinite(row.value));
}

/**
 * Writes metrics for the given members' own posts (idempotent) and removes
 * history for anyone who is no longer opted in.
 */
export async function syncClinicalMetrics(optedInMemberIds: string[], posts: Post[]) {
  await ensureSchema();
  const allowed = new Set(optedInMemberIds);
  const rows = posts.filter((post) => allowed.has(post.authorId)).flatMap(metricsForPost);
  const client = await pool().connect();
  try {
    await client.query("begin");
    // Consent revocation: drop history for members who are not currently opted in.
    await client.query("delete from clinical_metrics where not (member_id = any($1::text[]))", [optedInMemberIds]);
    for (let index = 0; index < rows.length; index += 500) {
      const chunk = rows.slice(index, index + 500);
      const values: unknown[] = [];
      const tuples = chunk.map((row, i) => {
        values.push(row.memberId, row.measuredAt, row.metric, row.value, row.channel, row.postId);
        const o = i * 6;
        return `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6})`;
      });
      await client.query(
        `insert into clinical_metrics (member_id, measured_at, metric_name, metric_value, source_channel, post_id)
         values ${tuples.join(", ")}
         on conflict do nothing`,
        values,
      );
    }
    await client.query("commit");
    return { written: rows.length };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

function changeOf(current: number | null, baseline: number | null) {
  if (current === null || baseline === null) return null;
  if (baseline === 0) return current === 0 ? 0 : null;
  return (current - baseline) / Math.abs(baseline);
}

/** Recent 14-day average vs the previous 30-day baseline, computed in TigerData. */
export async function compareToBaseline(memberId: string, referenceDate: Date): Promise<TimeseriesSummary> {
  await ensureSchema();
  const { rows } = await pool().query<{
    metric_name: MetricName;
    current_avg: number | null;
    baseline_avg: number | null;
    current_n: string;
    baseline_n: string;
  }>(
    `select metric_name,
            avg(metric_value) filter (where measured_at >= $2::timestamptz - make_interval(days => $3)) as current_avg,
            avg(metric_value) filter (where measured_at <  $2::timestamptz - make_interval(days => $3)) as baseline_avg,
            count(*) filter (where measured_at >= $2::timestamptz - make_interval(days => $3)) as current_n,
            count(*) filter (where measured_at <  $2::timestamptz - make_interval(days => $3)) as baseline_n
       from clinical_metrics
      where member_id = $1
        and measured_at >= $2::timestamptz - make_interval(days => $3 + $4)
        and measured_at <  $2::timestamptz
      group by metric_name`,
    [memberId, referenceDate.toISOString(), WINDOW_DAYS, BASELINE_DAYS],
  );

  const metrics: MetricComparison[] = rows.map((row) => {
    const current = row.current_avg === null ? null : Number(row.current_avg);
    const baseline = row.baseline_avg === null ? null : Number(row.baseline_avg);
    return {
      metric: row.metric_name,
      current,
      baseline,
      // A percent change on clock hour is meaningless; keep the averages only.
      change: row.metric_name === "hour_of_day" ? null : changeOf(current, baseline),
      currentSamples: Number(row.current_n),
      baselineSamples: Number(row.baseline_n),
    };
  });

  // Engagement cadence: messages per week in each window.
  const posts = metrics.find((metric) => metric.metric === "word_count");
  if (posts) {
    const current = posts.currentSamples / (WINDOW_DAYS / 7);
    const baseline = posts.baselineSamples / (BASELINE_DAYS / 7);
    metrics.push({
      metric: "messages_per_week",
      current,
      baseline,
      change: changeOf(current, baseline),
      currentSamples: posts.currentSamples,
      baselineSamples: posts.baselineSamples,
    });
  }

  return {
    source: "tigerdata",
    windowDays: WINDOW_DAYS,
    baselineDays: BASELINE_DAYS,
    computedAt: new Date().toISOString(),
    metrics: metrics.sort((a, b) => a.metric.localeCompare(b.metric)),
  };
}

/** Daily points for the clinician trend chart (days without messages are zero). */
export async function dailyTrend(memberId: string, days: number, referenceDate = new Date()): Promise<DailyPoint[]> {
  await ensureSchema();
  const { rows } = await pool().query<{
    day: Date;
    posts: string;
    lexical_diversity: number | null;
    sentence_length: number | null;
    sentiment: number | null;
    night_posts: number | null;
  }>(
    `select time_bucket('1 day', measured_at) as day,
            count(*) filter (where metric_name = 'word_count')             as posts,
            avg(metric_value) filter (where metric_name = 'lexical_diversity') as lexical_diversity,
            avg(metric_value) filter (where metric_name = 'sentence_length')   as sentence_length,
            avg(metric_value) filter (where metric_name = 'sentiment')         as sentiment,
            sum(metric_value) filter (where metric_name = 'night_post')        as night_posts
       from clinical_metrics
      where member_id = $1
        and measured_at >= $2::timestamptz - make_interval(days => $3)
        and measured_at <  $2::timestamptz
      group by day
      order by day`,
    [memberId, referenceDate.toISOString(), days],
  );
  const byDay = new Map(rows.map((row) => [new Date(row.day).toISOString().slice(0, 10), row]));
  const points: DailyPoint[] = [];
  for (let index = days - 1; index >= 0; index -= 1) {
    const day = new Date(referenceDate);
    day.setUTCHours(0, 0, 0, 0);
    day.setUTCDate(day.getUTCDate() - index);
    const key = day.toISOString().slice(0, 10);
    const row = byDay.get(key);
    points.push({
      date: key,
      posts: row ? Number(row.posts) : 0,
      lexicalDiversity: row?.lexical_diversity == null ? 0 : Number(row.lexical_diversity),
      meanSentenceLength: row?.sentence_length == null ? 0 : Number(row.sentence_length),
      sentiment: row?.sentiment == null ? 0 : Number(row.sentiment),
      nightPosts: row?.night_posts == null ? 0 : Number(row.night_posts),
      repetition: 0,
    });
  }
  return points;
}
