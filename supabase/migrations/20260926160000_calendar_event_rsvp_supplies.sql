-- RSVP map + bring-list JSON used by family calendar / assistant create-event.
alter table public.calendar_events
  add column if not exists attending jsonb not null default '{}'::jsonb;

alter table public.calendar_events
  add column if not exists supplies jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
