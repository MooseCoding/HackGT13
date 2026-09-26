-- Per-circle preference: automatically schedule family calls on the calendar.
alter table public.families
  add column if not exists auto_add_family_calls boolean not null default true;

-- Any circle member can toggle this setting (owner policy still applies too).
drop policy if exists "members update circle settings" on public.families;
create policy "members update circle settings" on public.families
  for update to authenticated
  using (public.has_family_access(id))
  with check (public.has_family_access(id));

notify pgrst, 'reload schema';
