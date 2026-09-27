-- TigerData (Timescale) schema for Familyr clinical communication metrics.
-- The app also creates this automatically on first use; run it by hand if you
-- prefer to provision ahead of time (psql "$TIGERDATA_DATABASE_URL" -f tigerdata/schema.sql).
--
-- One row per metric per message, for members who are opted in to clinician
-- sharing. Rows for members who opt out are deleted on the next analysis run.
-- Supabase remains the source of truth for snapshots, alerts and reports.

create table if not exists clinical_metrics (
  member_id      text             not null,
  measured_at    timestamptz      not null,
  metric_name    text             not null,  -- word_count, lexical_diversity, sentence_length, sentiment,
                                             -- hour_of_day, night_post, morning_post,
                                             -- voice_words_per_minute, voice_pause_ratio, voice_hesitation_rate
  metric_value   double precision not null,
  source_channel text             not null default 'hearth',
  post_id        text             not null,
  metadata       jsonb            not null default '{}'::jsonb
);

select create_hypertable('clinical_metrics', by_range('measured_at'), if_not_exists => true);

create unique index if not exists clinical_metrics_dedupe_idx
  on clinical_metrics (member_id, post_id, metric_name, measured_at);
create index if not exists clinical_metrics_member_metric_time_idx
  on clinical_metrics (member_id, metric_name, measured_at desc);

-- Example: recent 14 days vs the previous 30 days for one member.
-- select metric_name,
--        avg(metric_value) filter (where measured_at >= now() - interval '14 days') as recent,
--        avg(metric_value) filter (where measured_at <  now() - interval '14 days') as baseline
--   from clinical_metrics
--  where member_id = 'elena' and measured_at >= now() - interval '44 days'
--  group by metric_name;
