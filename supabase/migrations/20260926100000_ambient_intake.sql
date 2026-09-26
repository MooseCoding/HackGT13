-- Ambient communication intake metadata for WhatsApp, phone, and future channels.
-- Raw audio is processed transiently; clinicians receive derived signals only.

alter table public.posts
  add column if not exists source_channel text not null default 'hearth'
    check (source_channel in ('hearth', 'whatsapp', 'phone', 'demo')),
  add column if not exists external_message_id text,
  add column if not exists audio_metrics jsonb,
  add column if not exists raw_retained boolean not null default true;

create unique index if not exists posts_external_message_id_idx
  on public.posts (external_message_id)
  where external_message_id is not null;

comment on column public.posts.audio_metrics is
  'Derived acoustic features only: duration, words/minute, pause ratio, average pause, hesitation rate.';
comment on column public.posts.raw_retained is
  'False for ambient channel intake when raw message or audio is discarded after feature extraction.';

-- One additional historical voice observation keeps the demo comparison window honest.
insert into public.posts (
  id, family_id, author_id, kind, body, transcript, voice_seconds, created_at,
  source_channel, audio_metrics, raw_retained
)
select
  'r-baseline', 'okonkwo', 'ruth', 'voice', 'Voice update',
  'The garden club met by the library this morning. We planned the autumn beds, shared tea, and made a list for next week.',
  18, '2026-08-21T09:25:00-04:00', 'whatsapp',
  '{"durationSeconds":18,"wordsPerMinute":103,"pauseRatio":0.1,"averagePauseSeconds":0.35,"hesitationRate":0.01}'::jsonb,
  false
where exists (select 1 from public.members where id = 'ruth')
on conflict (id) do nothing;
