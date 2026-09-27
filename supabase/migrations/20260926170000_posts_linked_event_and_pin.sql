-- Chat pins + assistant/calendar create need a linked event id and event_pin kind.

alter table public.posts
  add column if not exists linked_event_id text references public.calendar_events (id) on delete set null;

alter table public.posts drop constraint if exists posts_kind_check;
alter table public.posts
  add constraint posts_kind_check
  check (kind in ('text', 'voice', 'photo', 'status', 'event_pin'));

create index if not exists posts_linked_event_idx
  on public.posts (linked_event_id)
  where linked_event_id is not null;

notify pgrst, 'reload schema';
