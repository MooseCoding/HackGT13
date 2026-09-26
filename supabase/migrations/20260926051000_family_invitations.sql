-- Link invitations: family members can invite someone by email; invitee accepts and joins.

create table if not exists public.family_invitations (
  id text primary key,
  family_id text not null references public.families (id) on delete cascade,
  member_id text not null references public.members (id) on delete cascade,
  token text not null unique,
  email text not null,
  invitee_name text not null,
  role text not null default 'Family',
  invited_by uuid references auth.users (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create index if not exists family_invitations_family_idx on public.family_invitations (family_id);
create index if not exists family_invitations_email_idx on public.family_invitations (lower(email));
create unique index if not exists family_invitations_pending_email_idx
  on public.family_invitations (family_id, lower(email))
  where status = 'pending';

alter table public.family_invitations enable row level security;

create policy "family members read invitations" on public.family_invitations
  for select to authenticated
  using (public.has_family_access(family_id));

create policy "family members create invitations" on public.family_invitations
  for insert to authenticated
  with check (public.has_family_access(family_id));

create policy "family members update invitations" on public.family_invitations
  for update to authenticated
  using (public.has_family_access(family_id))
  with check (public.has_family_access(family_id));

-- Anyone with the token can look up a pending invite (used on /invite/[token]).
create or replace function public.get_invitation_by_token(token_input text)
returns table (
  id text,
  family_id text,
  family_name text,
  invitee_name text,
  role text,
  email text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    i.id,
    i.family_id,
    f.name,
    i.invitee_name,
    i.role,
    i.email,
    i.status
  from public.family_invitations i
  join public.families f on f.id = i.family_id
  where i.token = trim(token_input)
  limit 1;
end;
$$;

revoke all on function public.get_invitation_by_token(text) from public;
grant execute on function public.get_invitation_by_token(text) to anon, authenticated;

create or replace function public.accept_family_invitation(token_input text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.family_invitations%rowtype;
  claim public.members%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in to accept an invitation';
  end if;

  select * into inv
  from public.family_invitations
  where token = trim(token_input)
    and status = 'pending'
  for update
  limit 1;

  if inv.id is null then
    raise exception 'Invitation not found or already used';
  end if;

  -- If this account already belongs to another family, block the switch.
  if exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.family_id is not null
      and p.family_id <> inv.family_id
  ) then
    raise exception 'You already belong to a family. Sign out or leave before joining another.';
  end if;

  select * into claim from public.members where id = inv.member_id for update;
  if claim.id is null then
    raise exception 'Invited member profile is missing';
  end if;
  if claim.user_id is not null and claim.user_id <> auth.uid() then
    raise exception 'That member profile is already claimed';
  end if;

  update public.members
  set user_id = auth.uid()
  where id = claim.id;

  insert into public.profiles (id, family_id, member_id, display_name)
  values (auth.uid(), inv.family_id, claim.id, claim.name)
  on conflict (id) do update set
    family_id = excluded.family_id,
    member_id = excluded.member_id,
    display_name = excluded.display_name;

  update public.family_invitations
  set status = 'accepted', accepted_at = now()
  where id = inv.id;

  return true;
end;
$$;

revoke all on function public.accept_family_invitation(text) from public, anon;
grant execute on function public.accept_family_invitation(text) to authenticated;

-- Members of a family can insert new member stubs when inviting.
drop policy if exists "insert own members" on public.members;
create policy "insert members for family" on public.members
  for insert to authenticated
  with check (public.has_family_access(family_id) or public.is_family_owner(family_id));
