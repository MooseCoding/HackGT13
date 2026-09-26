-- Multiple authenticated accounts can belong to one family while each account
-- remains bound to exactly one member identity. Consent is stored on that member.

alter table public.families
  add column if not exists join_code text;

update public.families
set join_code = case id
  when 'alvarez' then 'ALVAREZ42'
  when 'okonkwo' then 'OKONKWO42'
  else upper(substr(md5(id || clock_timestamp()::text), 1, 8))
end
where join_code is null;

alter table public.families alter column join_code set not null;
create unique index if not exists families_join_code_idx on public.families (upper(join_code));

alter table public.members
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create unique index if not exists members_user_id_idx
  on public.members (user_id) where user_id is not null;

insert into public.posts (id, family_id, author_id, kind, body, created_at)
values
  ('history-1', 'alvarez', 'elena', 'text',
    'The neighborhood walk was cool this morning. I stopped by the corner garden and brought home mint for tea.',
    '2026-08-15T08:20:00-04:00'),
  ('history-2', 'alvarez', 'miguel', 'text',
    'Sunday lunch photos are finally in the album. Ma, the one of you and Sofia is my favorite.',
    '2026-08-16T14:10:00-04:00'),
  ('history-3', 'alvarez', 'elena', 'status',
    'Beans are simmering and the porch radio is on. Come by if you are nearby.',
    '2026-08-25T10:35:00-04:00'),
  ('history-4', 'alvarez', 'priya', 'text',
    'I put Sofia''s game and the family dinner on the calendar so nobody has to hunt through messages.',
    '2026-09-01T15:25:00-04:00'),
  ('history-5', 'alvarez', 'elena', 'text',
    'Watered the tomatoes before breakfast. The yellow ones are coming in slowly but they taste sweet.',
    '2026-09-07T08:05:00-04:00')
on conflict (id) do nothing;

update public.members m
set user_id = p.id
from public.profiles p
where p.member_id = m.id and m.user_id is null;

create or replace function public.has_family_access(fid text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.families f
    where f.id = fid and f.owner_id = auth.uid()
  ) or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.family_id = fid
  );
$$;

grant execute on function public.has_family_access(text) to anon, authenticated;

create or replace function public.join_family(invite_code_input text, member_name_input text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_member public.members%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in to join a family';
  end if;

  select m.* into claimed_member
  from public.members m
  join public.families f on f.id = m.family_id
  where upper(f.join_code) = upper(trim(invite_code_input))
    and lower(trim(m.name)) = lower(trim(member_name_input))
    and m.user_id is null
  for update of m
  limit 1;

  if claimed_member.id is null then
    return false;
  end if;

  update public.members set user_id = auth.uid() where id = claimed_member.id;
  insert into public.profiles (id, family_id, member_id, display_name)
  values (auth.uid(), claimed_member.family_id, claimed_member.id, claimed_member.name)
  on conflict (id) do update set
    family_id = excluded.family_id,
    member_id = excluded.member_id,
    display_name = excluded.display_name;
  return true;
end;
$$;

revoke all on function public.join_family(text, text) from public, anon;
grant execute on function public.join_family(text, text) to authenticated;

drop policy if exists "read families" on public.families;
create policy "read families" on public.families
  for select to anon, authenticated
  using ((auth.uid() is null and owner_id is null) or public.has_family_access(id));

drop policy if exists "read members" on public.members;
create policy "read members" on public.members
  for select to anon, authenticated
  using (
    (auth.uid() is null and exists (select 1 from public.families f where f.id = members.family_id and f.owner_id is null))
    or public.has_family_access(members.family_id)
  );

drop policy if exists "update own members" on public.members;
create policy "update own member or owned family" on public.members
  for update to authenticated
  using (user_id = auth.uid() or public.is_family_owner(family_id))
  with check (user_id = auth.uid() or public.is_family_owner(family_id));

drop policy if exists "read posts" on public.posts;
create policy "read posts" on public.posts
  for select to anon, authenticated
  using (
    (auth.uid() is null and exists (select 1 from public.families f where f.id = family_id and f.owner_id is null))
    or public.has_family_access(family_id)
  );

drop policy if exists "insert posts" on public.posts;
create policy "insert posts" on public.posts
  for insert to anon, authenticated
  with check (
    (auth.uid() is null and exists (select 1 from public.families f where f.id = family_id and f.owner_id is null))
    or (
      public.has_family_access(family_id)
      and exists (
        select 1 from public.members m
        where m.id = author_id and m.family_id = posts.family_id
          and (m.user_id = auth.uid() or public.is_family_owner(posts.family_id))
      )
    )
  );

drop policy if exists "read events" on public.calendar_events;
create policy "read events" on public.calendar_events
  for select to anon, authenticated
  using (
    (auth.uid() is null and exists (select 1 from public.families f where f.id = family_id and f.owner_id is null))
    or public.has_family_access(family_id)
  );

drop policy if exists "insert events" on public.calendar_events;
create policy "insert events" on public.calendar_events
  for insert to anon, authenticated
  with check (
    (auth.uid() is null and exists (select 1 from public.families f where f.id = family_id and f.owner_id is null))
    or public.has_family_access(family_id)
  );

drop policy if exists "read digests" on public.digests;
create policy "read digests" on public.digests
  for select to anon, authenticated
  using (
    (auth.uid() is null and exists (select 1 from public.families f where f.id = family_id and f.owner_id is null))
    or public.has_family_access(family_id)
  );

drop policy if exists "write digests" on public.digests;
create policy "write digests" on public.digests
  for insert to anon, authenticated
  with check (
    (auth.uid() is null and exists (select 1 from public.families f where f.id = family_id and f.owner_id is null))
    or public.has_family_access(family_id)
  );

drop policy if exists "update digests" on public.digests;
create policy "update digests" on public.digests
  for update to anon, authenticated
  using (
    (auth.uid() is null and exists (select 1 from public.families f where f.id = family_id and f.owner_id is null))
    or public.has_family_access(family_id)
  )
  with check (
    (auth.uid() is null and exists (select 1 from public.families f where f.id = family_id and f.owner_id is null))
    or public.has_family_access(family_id)
  );

drop policy if exists "delete digests" on public.digests;
create policy "delete digests" on public.digests
  for delete to anon, authenticated
  using (
    (auth.uid() is null and exists (select 1 from public.families f where f.id = family_id and f.owner_id is null))
    or public.has_family_access(family_id)
  );
