-- Create a family atomically after verifying the caller. This avoids partial
-- onboarding and keeps all privilege elevation inside one narrowly scoped RPC.

create or replace function public.create_family_circle(
  family_id_input text,
  family_name_input text,
  tagline_input text,
  join_code_input text,
  members_input jsonb,
  you_member_id_input text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Sign in to create a family';
  end if;

  if coalesce(trim(family_name_input), '') = '' then
    raise exception 'Family name is required';
  end if;

  if jsonb_typeof(members_input) <> 'array' or jsonb_array_length(members_input) < 1 then
    raise exception 'At least one member is required';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(members_input) member
    where member ->> 'id' = you_member_id_input
  ) then
    raise exception 'Your member profile is missing';
  end if;

  insert into public.families (id, name, tagline, owner_id, join_code)
  values (
    family_id_input,
    trim(family_name_input),
    coalesce(nullif(trim(tagline_input), ''), 'Our family circle'),
    caller_id,
    upper(trim(join_code_input))
  );

  insert into public.members (
    id, family_id, name, role, age, initials, color, location,
    street, apt, city, state, postal_code, country,
    clinical_opt_in, easy_mode_default, user_id
  )
  select
    member.id,
    family_id_input,
    member.name,
    member.role,
    member.age,
    member.initials,
    member.color,
    member.location,
    member.street,
    member.apt,
    member.city,
    member.state,
    member.postal_code,
    member.country,
    member.clinical_opt_in,
    member.easy_mode_default,
    case when member.id = you_member_id_input then caller_id else null end
  from jsonb_to_recordset(members_input) as member(
    id text,
    name text,
    role text,
    age integer,
    initials text,
    color text,
    location text,
    street text,
    apt text,
    city text,
    state text,
    postal_code text,
    country text,
    clinical_opt_in boolean,
    easy_mode_default boolean
  );

  insert into public.profiles (id, family_id, member_id, display_name)
  select caller_id, family_id_input, m.id, m.name
  from public.members m
  where m.id = you_member_id_input and m.family_id = family_id_input
  on conflict (id) do update set
    family_id = excluded.family_id,
    member_id = excluded.member_id,
    display_name = excluded.display_name;

  return family_id_input;
end;
$$;

revoke all on function public.create_family_circle(text, text, text, text, jsonb, text)
  from public, anon;
grant execute on function public.create_family_circle(text, text, text, text, jsonb, text)
  to authenticated;

notify pgrst, 'reload schema';
