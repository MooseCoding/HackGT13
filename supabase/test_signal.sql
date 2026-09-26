-- HACKATHON TEST DATA ONLY.
-- Run in the Supabase SQL Editor after changing target_name to your member name.
-- Creates a healthy personal baseline plus a recent multi-signal change.
-- Safe to rerun: test rows use stable IDs and are updated in place.

do $$
declare
  target_name text := 'nish';
  target_member_id text;
  target_family_id text;
begin
  select id, family_id
    into target_member_id, target_family_id
  from public.members
  where lower(name) = lower(target_name)
  limit 1;

  if target_member_id is null then
    raise exception 'No member named %. Check public.members and update target_name.', target_name;
  end if;

  update public.members
  set clinical_opt_in = true
  where id = target_member_id;

  insert into public.posts (id, family_id, author_id, kind, body, created_at, source_channel, raw_retained)
  values
    (
      'clinical-test-' || target_member_id || '-baseline-1', target_family_id, target_member_id, 'text',
      'I had a wonderful morning at the garden, shared tea with friends, and planned our family dinner for Sunday.',
      date_trunc('day', now()) - interval '40 days' + interval '9 hours', 'demo', false
    ),
    (
      'clinical-test-' || target_member_id || '-baseline-2', target_family_id, target_member_id, 'text',
      'The library club was great today. We discussed a beautiful novel and laughed together over lunch afterward.',
      date_trunc('day', now()) - interval '34 days' + interval '10 hours', 'demo', false
    ),
    (
      'clinical-test-' || target_member_id || '-baseline-3', target_family_id, target_member_id, 'text',
      'I finished the shopping, called my sister, watered the plants, and made a delicious soup for everyone.',
      date_trunc('day', now()) - interval '27 days' + interval '8 hours', 'demo', false
    ),
    (
      'clinical-test-' || target_member_id || '-baseline-4', target_family_id, target_member_id, 'text',
      'Feeling grateful and calm after our neighborhood walk. Tomorrow I will organize the photographs from the picnic.',
      date_trunc('day', now()) - interval '18 days' + interval '9 hours', 'demo', false
    ),
    (
      'clinical-test-' || target_member_id || '-recent-1', target_family_id, target_member_id, 'text',
      'I forgot the list. I am tired and confused. I cannot find the list.',
      date_trunc('day', now()) - interval '3 days' + interval '1 hour 10 minutes', 'demo', false
    ),
    (
      'clinical-test-' || target_member_id || '-recent-2', target_family_id, target_member_id, 'text',
      'I forgot the list. I am tired and confused. I cannot find the list.',
      date_trunc('day', now()) - interval '2 days' + interval '1 hour 20 minutes', 'demo', false
    ),
    (
      'clinical-test-' || target_member_id || '-recent-3', target_family_id, target_member_id, 'text',
      'I forgot the list. I am tired and confused. I cannot find the list.',
      date_trunc('day', now()) - interval '1 day' + interval '1 hour 30 minutes', 'demo', false
    )
  on conflict (id) do update set
    body = excluded.body,
    created_at = excluded.created_at,
    source_channel = excluded.source_channel,
    raw_retained = excluded.raw_retained;

  raise notice 'Created a synthetic baseline shift for % (%)', target_name, target_member_id;
end $$;

-- Optional cleanup after judging:
-- delete from public.posts where id like 'clinical-test-%';
