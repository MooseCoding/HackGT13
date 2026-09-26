drop policy if exists "delete events" on public.calendar_events;
create policy "delete events" on public.calendar_events
  for delete to anon, authenticated
  using (
    exists (select 1 from public.families f where f.id = family_id and f.owner_id is null)
    or public.has_family_access(family_id)
  );
