-- Auth profiles + family ownership so Google-signed-in users can create a circle.
create schema if not exists private;

alter table public.families
  add column if not exists owner_id uuid references auth.users (id) on delete cascade;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  family_id text references public.families (id) on delete set null,
  member_id text references public.members (id) on delete set null,
  display_name text,
  created_at timestamptz not null default now()
);

create index if not exists families_owner_idx on public.families (owner_id);
create index if not exists profiles_family_idx on public.profiles (family_id);

alter table public.profiles enable row level security;

create or replace function public.is_family_owner(fid text)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.families f
    where f.id = fid
      and f.owner_id is not null
      and f.owner_id = auth.uid()
  );
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Replace open demo policies with owner-aware access. Seed rows keep owner_id null
-- so anonymous demo/live reads still work; signed-in users only see their circle.
drop policy if exists "public read families" on public.families;
drop policy if exists "public read members" on public.members;
drop policy if exists "public read posts" on public.posts;
drop policy if exists "public insert posts" on public.posts;
drop policy if exists "public read events" on public.calendar_events;
drop policy if exists "public insert events" on public.calendar_events;
drop policy if exists "public read digests" on public.digests;
drop policy if exists "public insert digests" on public.digests;
drop policy if exists "public update digests" on public.digests;
drop policy if exists "public delete digests" on public.digests;

create policy "read families" on public.families
  for select to anon, authenticated
  using (
    (auth.uid() is null and owner_id is null)
    or owner_id = auth.uid()
  );

create policy "insert own family" on public.families
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy "update own family" on public.families
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "read members" on public.members
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.families f
      where f.id = family_id
        and (
          (auth.uid() is null and f.owner_id is null)
          or f.owner_id = auth.uid()
        )
    )
  );

create policy "insert own members" on public.members
  for insert to authenticated
  with check (public.is_family_owner(family_id));

create policy "update own members" on public.members
  for update to authenticated
  using (public.is_family_owner(family_id))
  with check (public.is_family_owner(family_id));

create policy "delete own members" on public.members
  for delete to authenticated
  using (public.is_family_owner(family_id));

create policy "read posts" on public.posts
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.families f
      where f.id = family_id
        and (
          (auth.uid() is null and f.owner_id is null)
          or f.owner_id = auth.uid()
        )
    )
  );

create policy "insert posts" on public.posts
  for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.families f
      where f.id = family_id
        and (
          (auth.uid() is null and f.owner_id is null)
          or f.owner_id = auth.uid()
        )
    )
  );

create policy "read events" on public.calendar_events
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.families f
      where f.id = family_id
        and (
          (auth.uid() is null and f.owner_id is null)
          or f.owner_id = auth.uid()
        )
    )
  );

create policy "insert events" on public.calendar_events
  for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.families f
      where f.id = family_id
        and (
          (auth.uid() is null and f.owner_id is null)
          or f.owner_id = auth.uid()
        )
    )
  );

create policy "read digests" on public.digests
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.families f
      where f.id = family_id
        and (
          (auth.uid() is null and f.owner_id is null)
          or f.owner_id = auth.uid()
        )
    )
  );

create policy "write digests" on public.digests
  for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.families f
      where f.id = family_id
        and (
          (auth.uid() is null and f.owner_id is null)
          or f.owner_id = auth.uid()
        )
    )
  );

create policy "update digests" on public.digests
  for update to anon, authenticated
  using (
    exists (
      select 1 from public.families f
      where f.id = family_id
        and (
          (auth.uid() is null and f.owner_id is null)
          or f.owner_id = auth.uid()
        )
    )
  )
  with check (
    exists (
      select 1 from public.families f
      where f.id = family_id
        and (
          (auth.uid() is null and f.owner_id is null)
          or f.owner_id = auth.uid()
        )
    )
  );

create policy "delete digests" on public.digests
  for delete to anon, authenticated
  using (
    exists (
      select 1 from public.families f
      where f.id = family_id
        and (
          (auth.uid() is null and f.owner_id is null)
          or f.owner_id = auth.uid()
        )
    )
  );

create policy "read own profile" on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "insert own profile" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());
