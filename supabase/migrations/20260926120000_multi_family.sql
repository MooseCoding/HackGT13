-- Multi-family: one member row per circle per Google account; profile tracks active circle.

drop index if exists public.members_user_id_idx;

create unique index if not exists members_family_user_idx
  on public.members (family_id, user_id)
  where user_id is not null;

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
    select 1 from public.members m
    where m.family_id = fid and m.user_id = auth.uid()
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

create or replace function public.set_active_family(family_id_input text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  member_row public.members%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in to switch families';
  end if;

  if not public.has_family_access(family_id_input) then
    return false;
  end if;

  select * into member_row
  from public.members m
  where m.family_id = family_id_input
    and m.user_id = auth.uid()
  limit 1;

  if member_row.id is null then
    raise exception 'No member profile found in this family';
  end if;

  insert into public.profiles (id, family_id, member_id, display_name)
  values (auth.uid(), family_id_input, member_row.id, member_row.name)
  on conflict (id) do update set
    family_id = excluded.family_id,
    member_id = excluded.member_id,
    display_name = excluded.display_name;

  return true;
end;
$$;

revoke all on function public.set_active_family(text) from public, anon;
grant execute on function public.set_active_family(text) to authenticated;

notify pgrst, 'reload schema';
