-- Production hardening for Hearth.
--
-- What this migration does (all steps are idempotent and non-destructive):
--   1. Fixes schema drift the app already depends on (posts.linked_event_id,
--      'event_pin' post kind, realtime publication for posts).
--   2. Removes every anonymous (signed-out) read/write path. The public demo runs
--      on in-memory data, so live Supabase data is only reachable when signed in.
--   3. Closes privilege-escalation holes found in review:
--        - a member could set families.owner_id to themselves
--        - a member could move their member row into another family (family_id)
--        - an invite could point at a member in a different family
--        - profiles.account_role could be set on insert (self-promote to clinician)
--        - profiles.family_id / member_id were directly writable
--        - calendar_events had no UPDATE policy, so RSVPs/bring-lists silently failed
--   4. Makes clinical consent enforceable in the database: a clinician can only see
--      patients who are currently opted in and not assigned to another clinician.
--      Opting out releases the assignment and closes open alerts.
--   5. Adds invitation expiry, write-scope guards, input size limits and the
--      missing foreign-key / RLS helper indexes.
--
-- Guard triggers only restrict requests made through the API roles
-- (anon/authenticated). The service role and SECURITY DEFINER RPCs are trusted.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. Schema drift
-- ---------------------------------------------------------------------------

alter table public.posts add column if not exists linked_event_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'posts_linked_event_id_fkey' and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts
      add constraint posts_linked_event_id_fkey
      foreign key (linked_event_id) references public.calendar_events (id)
      on delete set null not valid;
  end if;
end $$;

alter table public.posts drop constraint if exists posts_kind_check;
alter table public.posts
  add constraint posts_kind_check
  check (kind in ('text', 'voice', 'photo', 'status', 'event_pin'));

-- Live chat subscribes to postgres_changes on posts (RLS still applies).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'posts'
     ) then
    alter publication supabase_realtime add table public.posts;
  end if;
end $$;

-- Size limits keep a single request from storing megabytes of text.
-- NOT VALID: enforced for new writes without rescanning existing rows.
alter table public.posts drop constraint if exists posts_body_length_check;
alter table public.posts add constraint posts_body_length_check
  check (char_length(body) <= 10000 and char_length(coalesce(transcript, '')) <= 20000) not valid;

alter table public.calendar_events drop constraint if exists calendar_events_text_length_check;
alter table public.calendar_events add constraint calendar_events_text_length_check
  check (char_length(title) <= 300 and char_length(source_text) <= 5000) not valid;

alter table public.members drop constraint if exists members_name_length_check;
alter table public.members add constraint members_name_length_check
  check (char_length(name) between 1 and 120) not valid;

alter table public.families drop constraint if exists families_text_length_check;
alter table public.families add constraint families_text_length_check
  check (char_length(name) between 1 and 120 and char_length(join_code) between 6 and 32) not valid;

-- ---------------------------------------------------------------------------
-- 2. Helper functions
-- ---------------------------------------------------------------------------

-- Guard triggers below check current_user: inside a request it is 'anon' or
-- 'authenticated'; for the service role and SECURITY DEFINER RPCs it is not.
-- (The check is inlined because API roles have no USAGE on schema private.)

-- Postgres grants EXECUTE to PUBLIC by default; narrow every helper explicitly.
revoke all on function public.has_family_access(text) from public, anon;
grant execute on function public.has_family_access(text) to authenticated, service_role;

revoke all on function public.is_family_owner(text) from public, anon;
grant execute on function public.is_family_owner(text) to authenticated, service_role;

revoke all on function public.is_clinician() from public, anon;
grant execute on function public.is_clinician() to authenticated, service_role;

create or replace function public.clinician_can_access_member(mid text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_clinician()
    and exists (
      select 1 from public.members m
      where m.id = mid and m.clinical_opt_in
    )
    and not exists (
      select 1 from public.clinical_patient_assignments a
      where a.member_id = mid and a.clinician_id <> auth.uid()
    );
$$;

revoke all on function public.clinician_can_access_member(text) from public, anon;
grant execute on function public.clinician_can_access_member(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Families
-- ---------------------------------------------------------------------------

drop policy if exists "read families" on public.families;
drop policy if exists "insert own family" on public.families;
drop policy if exists "update own family" on public.families;
drop policy if exists "members update circle settings" on public.families;

drop policy if exists "families: members read" on public.families;
create policy "families: members read" on public.families
  for select to authenticated
  using (owner_id = (select auth.uid()) or public.has_family_access(id));

drop policy if exists "families: owner inserts" on public.families;
create policy "families: owner inserts" on public.families
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "families: members update settings" on public.families;
create policy "families: members update settings" on public.families
  for update to authenticated
  using (public.has_family_access(id))
  with check (public.has_family_access(id));

create or replace function private.guard_family_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if new.id is distinct from old.id or new.owner_id is distinct from old.owner_id then
    raise exception 'A circle''s id and owner cannot be changed.' using errcode = '42501';
  end if;
  if old.owner_id is distinct from auth.uid()
     and (new.name, new.tagline, new.join_code) is distinct from (old.name, old.tagline, old.join_code) then
    raise exception 'Only the circle owner can change circle details.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_family_update on public.families;
create trigger guard_family_update
  before update on public.families
  for each row execute function private.guard_family_update();

-- Seeded sample circles have no owner and well-known join codes. Rotate them so
-- nobody can join the sample data in production. The in-app demo is unaffected
-- (it runs on in-memory data).
update public.families
set join_code = upper(substr(md5(random()::text || id || clock_timestamp()::text), 1, 12))
where owner_id is null
  and upper(join_code) in ('ALVAREZ42', 'OKONKWO42');

-- ---------------------------------------------------------------------------
-- 4. Members
-- ---------------------------------------------------------------------------

drop policy if exists "read members" on public.members;
drop policy if exists "insert own members" on public.members;
drop policy if exists "insert members for family" on public.members;
drop policy if exists "update own members" on public.members;
drop policy if exists "update own member or owned family" on public.members;
drop policy if exists "delete own members" on public.members;

drop policy if exists "members: circle reads" on public.members;
create policy "members: circle reads" on public.members
  for select to authenticated
  using (public.has_family_access(family_id));

-- Circle members may add unclaimed member stubs (invitations). Only you can
-- attach your own account, and nobody can opt someone else into clinical sharing.
drop policy if exists "members: circle inserts stubs" on public.members;
create policy "members: circle inserts stubs" on public.members
  for insert to authenticated
  with check (
    public.has_family_access(family_id)
    and (user_id is null or user_id = (select auth.uid()))
    and (clinical_opt_in = false or user_id = (select auth.uid()))
  );

drop policy if exists "members: self or owner updates" on public.members;
create policy "members: self or owner updates" on public.members
  for update to authenticated
  using (user_id = (select auth.uid()) or public.is_family_owner(family_id))
  with check (user_id = (select auth.uid()) or public.is_family_owner(family_id));

drop policy if exists "members: owner deletes" on public.members;
create policy "members: owner deletes" on public.members
  for delete to authenticated
  using (public.is_family_owner(family_id));

create or replace function private.guard_member_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.family_id is distinct from old.family_id
     or new.user_id is distinct from old.user_id then
    raise exception 'Member id, circle and linked account cannot be changed directly.'
      using errcode = '42501';
  end if;
  -- Clinical sharing is the member's own decision. The circle owner may only set
  -- it for a member who has not claimed an account yet.
  if new.clinical_opt_in is distinct from old.clinical_opt_in
     and old.user_id is distinct from auth.uid()
     and not (old.user_id is null and public.is_family_owner(old.family_id)) then
    raise exception 'Only the member can change their clinical sharing consent.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_member_update on public.members;
create trigger guard_member_update
  before update on public.members
  for each row execute function private.guard_member_update();

-- Consent revocation: opting out releases the clinician and closes open alerts.
create or replace function private.on_clinical_opt_out()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.clinical_opt_in and not new.clinical_opt_in then
    delete from public.clinical_patient_assignments where member_id = new.id;
    update public.clinical_alerts
      set status = 'dismissed', updated_at = now()
      where member_id = new.id and status in ('new', 'reviewing');
  end if;
  return new;
end;
$$;

revoke all on function private.on_clinical_opt_out() from public, anon, authenticated;

drop trigger if exists on_clinical_opt_out on public.members;
create trigger on_clinical_opt_out
  after update of clinical_opt_in on public.members
  for each row execute function private.on_clinical_opt_out();

-- ---------------------------------------------------------------------------
-- 5. Posts
-- ---------------------------------------------------------------------------

drop policy if exists "read posts" on public.posts;
drop policy if exists "insert posts" on public.posts;

drop policy if exists "posts: circle reads" on public.posts;
create policy "posts: circle reads" on public.posts
  for select to authenticated
  using (public.has_family_access(family_id));

-- You post as yourself. The owner may post for a member who has no account yet
-- (e.g. a grandparent). WhatsApp/phone intake is written by the server only.
drop policy if exists "posts: members insert as self" on public.posts;
create policy "posts: members insert as self" on public.posts
  for insert to authenticated
  with check (
    source_channel = 'hearth'
    and public.has_family_access(family_id)
    and exists (
      select 1 from public.members m
      where m.id = author_id
        and m.family_id = posts.family_id
        and (
          m.user_id = (select auth.uid())
          or (m.user_id is null and public.is_family_owner(posts.family_id))
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Calendar events
-- ---------------------------------------------------------------------------

drop policy if exists "read events" on public.calendar_events;
drop policy if exists "insert events" on public.calendar_events;
drop policy if exists "update events" on public.calendar_events;
drop policy if exists "delete events" on public.calendar_events;

drop policy if exists "events: circle reads" on public.calendar_events;
create policy "events: circle reads" on public.calendar_events
  for select to authenticated
  using (public.has_family_access(family_id));

drop policy if exists "events: circle inserts" on public.calendar_events;
create policy "events: circle inserts" on public.calendar_events
  for insert to authenticated
  with check (
    public.has_family_access(family_id)
    and exists (
      select 1 from public.members m
      where m.id = created_by and m.family_id = calendar_events.family_id
    )
  );

-- Needed for RSVPs (attending) and bring-lists (supplies).
drop policy if exists "events: circle updates" on public.calendar_events;
create policy "events: circle updates" on public.calendar_events
  for update to authenticated
  using (public.has_family_access(family_id))
  with check (public.has_family_access(family_id));

drop policy if exists "events: circle deletes" on public.calendar_events;
create policy "events: circle deletes" on public.calendar_events
  for delete to authenticated
  using (public.has_family_access(family_id));

create or replace function private.guard_event_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.family_id is distinct from old.family_id
     or new.created_by is distinct from old.created_by then
    raise exception 'Event id, circle and creator cannot be changed.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_event_update on public.calendar_events;
create trigger guard_event_update
  before update on public.calendar_events
  for each row execute function private.guard_event_update();

-- ---------------------------------------------------------------------------
-- 7. Digests
-- ---------------------------------------------------------------------------

drop policy if exists "read digests" on public.digests;
drop policy if exists "write digests" on public.digests;
drop policy if exists "update digests" on public.digests;
drop policy if exists "delete digests" on public.digests;

drop policy if exists "digests: circle reads" on public.digests;
create policy "digests: circle reads" on public.digests
  for select to authenticated using (public.has_family_access(family_id));
drop policy if exists "digests: circle inserts" on public.digests;
create policy "digests: circle inserts" on public.digests
  for insert to authenticated with check (public.has_family_access(family_id));
drop policy if exists "digests: circle updates" on public.digests;
create policy "digests: circle updates" on public.digests
  for update to authenticated
  using (public.has_family_access(family_id))
  with check (public.has_family_access(family_id));
drop policy if exists "digests: circle deletes" on public.digests;
create policy "digests: circle deletes" on public.digests
  for delete to authenticated using (public.has_family_access(family_id));

-- ---------------------------------------------------------------------------
-- 8. Profiles: users edit their display name only. Active circle changes go
--    through set_active_family(); roles are assigned by the server.
-- ---------------------------------------------------------------------------

revoke insert, update, delete on public.profiles from anon;
revoke insert, update on public.profiles from authenticated;
revoke update (family_id, member_id, display_name, account_role) on public.profiles from authenticated;
revoke insert (family_id, member_id, account_role) on public.profiles from authenticated;
grant insert (id, display_name) on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

drop policy if exists "read own profile" on public.profiles;
drop policy if exists "insert own profile" on public.profiles;
drop policy if exists "update own profile" on public.profiles;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 9. Invitations
-- ---------------------------------------------------------------------------

alter table public.family_invitations
  add column if not exists expires_at timestamptz not null default (now() + interval '14 days');

drop policy if exists "family members read invitations" on public.family_invitations;
drop policy if exists "family members create invitations" on public.family_invitations;
drop policy if exists "family members update invitations" on public.family_invitations;

drop policy if exists "invitations: circle reads" on public.family_invitations;
create policy "invitations: circle reads" on public.family_invitations
  for select to authenticated using (public.has_family_access(family_id));

-- The invited member stub must be an unclaimed member of the same circle.
drop policy if exists "invitations: circle creates" on public.family_invitations;
create policy "invitations: circle creates" on public.family_invitations
  for insert to authenticated
  with check (
    public.has_family_access(family_id)
    and invited_by = (select auth.uid())
    and status = 'pending'
    and exists (
      select 1 from public.members m
      where m.id = member_id
        and m.family_id = family_invitations.family_id
        and m.user_id is null
    )
  );

drop policy if exists "invitations: circle revokes" on public.family_invitations;
create policy "invitations: circle revokes" on public.family_invitations
  for update to authenticated
  using (public.has_family_access(family_id))
  with check (public.has_family_access(family_id));

create or replace function private.guard_invitation_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if (new.id, new.family_id, new.member_id, new.token, new.email, new.invited_by, new.expires_at)
     is distinct from
     (old.id, old.family_id, old.member_id, old.token, old.email, old.invited_by, old.expires_at) then
    raise exception 'Invitations can only be revoked.' using errcode = '42501';
  end if;
  if new.status is distinct from old.status and new.status <> 'revoked' then
    raise exception 'Invitations can only be revoked.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_invitation_update on public.family_invitations;
create trigger guard_invitation_update
  before update on public.family_invitations
  for each row execute function private.guard_invitation_update();

-- Preview reports expired links as 'expired' so the page can say so.
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
stable
security definer
set search_path = ''
as $$
begin
  if coalesce(length(trim(token_input)), 0) < 16 then
    return;
  end if;
  return query
  select
    i.id,
    i.family_id,
    f.name,
    i.invitee_name,
    i.role,
    i.email,
    case when i.status = 'pending' and i.expires_at <= now() then 'expired' else i.status end
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
set search_path = ''
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
    and expires_at > now()
  for update
  limit 1;

  if inv.id is null then
    raise exception 'Invitation not found, expired, or already used';
  end if;

  select * into claim from public.members where id = inv.member_id for update;
  if claim.id is null or claim.family_id <> inv.family_id then
    raise exception 'Invited member profile is missing';
  end if;
  if claim.user_id is not null and claim.user_id <> auth.uid() then
    raise exception 'That member profile is already claimed';
  end if;
  if exists (
    select 1 from public.members m
    where m.family_id = inv.family_id and m.user_id = auth.uid() and m.id <> claim.id
  ) then
    raise exception 'You are already a member of this circle';
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

-- Remaining RPCs: callable only by signed-in users.
revoke all on function public.join_family(text, text) from public, anon;
grant execute on function public.join_family(text, text) to authenticated;
revoke all on function public.set_active_family(text) from public, anon;
grant execute on function public.set_active_family(text) to authenticated;
revoke all on function public.create_family_circle(text, text, text, text, jsonb, text) from public, anon;
grant execute on function public.create_family_circle(text, text, text, text, jsonb, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 10. Clinical data
-- ---------------------------------------------------------------------------

-- Nothing clinical is ever reachable without a session.
revoke all on public.clinical_analysis_runs, public.clinical_snapshots, public.clinical_alerts,
  public.clinical_patient_assignments, public.clinical_reports, public.clinical_report_notifications
  from anon;

-- Analysis runs and snapshots are written by the service role only.
revoke insert, update, delete on public.clinical_analysis_runs, public.clinical_snapshots
  from authenticated;

drop policy if exists "clinicians read snapshots" on public.clinical_snapshots;
create policy "clinicians read snapshots" on public.clinical_snapshots
  for select to authenticated
  using (public.clinician_can_access_member(member_id));

drop policy if exists "clinicians read alerts" on public.clinical_alerts;
drop policy if exists "clinicians update alerts" on public.clinical_alerts;
drop policy if exists "clinicians read alerts" on public.clinical_alerts;
create policy "clinicians read alerts" on public.clinical_alerts
  for select to authenticated
  using (public.clinician_can_access_member(member_id));
drop policy if exists "clinicians update alerts" on public.clinical_alerts;
create policy "clinicians update alerts" on public.clinical_alerts
  for update to authenticated
  using (public.clinician_can_access_member(member_id))
  with check (public.clinician_can_access_member(member_id));

create or replace function private.guard_alert_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if (new.id, new.snapshot_id, new.member_id, new.family_id, new.risk_level, new.fingerprint,
      new.title, new.summary, new.suggested_action, new.created_at)
     is distinct from
     (old.id, old.snapshot_id, old.member_id, old.family_id, old.risk_level, old.fingerprint,
      old.title, old.summary, old.suggested_action, old.created_at) then
    raise exception 'Clinicians can only change an alert''s review status.' using errcode = '42501';
  end if;
  if new.assigned_to is not null and new.assigned_to is distinct from old.assigned_to
     and new.assigned_to <> auth.uid() then
    raise exception 'Alerts can only be assigned to yourself.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_alert_update on public.clinical_alerts;
create trigger guard_alert_update
  before update on public.clinical_alerts
  for each row execute function private.guard_alert_update();

drop policy if exists "clinicians assign patients" on public.clinical_patient_assignments;
create policy "clinicians assign patients" on public.clinical_patient_assignments
  for insert to authenticated
  with check (
    clinician_id = (select auth.uid())
    and public.clinician_can_access_member(member_id)
  );

drop policy if exists "clinicians read clinical reports" on public.clinical_reports;
drop policy if exists "clinicians insert clinical reports" on public.clinical_reports;
drop policy if exists "clinicians update clinical reports" on public.clinical_reports;
drop policy if exists "clinicians read clinical reports" on public.clinical_reports;
create policy "clinicians read clinical reports" on public.clinical_reports
  for select to authenticated
  using (public.clinician_can_access_member(member_id));
drop policy if exists "clinicians insert clinical reports" on public.clinical_reports;
create policy "clinicians insert clinical reports" on public.clinical_reports
  for insert to authenticated
  with check (
    public.clinician_can_access_member(member_id)
    and status = 'draft'
    and exists (
      select 1 from public.clinical_snapshots s
      where s.id = snapshot_id and s.member_id = clinical_reports.member_id
    )
  );
drop policy if exists "clinicians update clinical reports" on public.clinical_reports;
create policy "clinicians update clinical reports" on public.clinical_reports
  for update to authenticated
  using (public.clinician_can_access_member(member_id))
  with check (public.clinician_can_access_member(member_id));

create or replace function private.guard_report_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if (new.id, new.snapshot_id, new.member_id, new.family_id, new.brief, new.findings,
      new.recommended_next_step, new.evidence_ids, new.model_provider, new.model_name,
      new.prompt_version, new.generated_at)
     is distinct from
     (old.id, old.snapshot_id, old.member_id, old.family_id, old.brief, old.findings,
      old.recommended_next_step, old.evidence_ids, old.model_provider, old.model_name,
      old.prompt_version, old.generated_at) then
    raise exception 'Generated report content cannot be edited.' using errcode = '42501';
  end if;
  if new.reviewed_by is distinct from old.reviewed_by and new.reviewed_by <> auth.uid() then
    raise exception 'You can only sign a review as yourself.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_report_update on public.clinical_reports;
create trigger guard_report_update
  before update on public.clinical_reports
  for each row execute function private.guard_report_update();

drop policy if exists "clinicians create own report notifications" on public.clinical_report_notifications;
create policy "clinicians create own report notifications" on public.clinical_report_notifications
  for insert to authenticated
  with check (
    clinician_id = (select auth.uid())
    and public.clinician_can_access_member(member_id)
    and exists (
      select 1 from public.clinical_reports r
      where r.id = report_id and r.member_id = clinical_report_notifications.member_id
    )
  );

-- ---------------------------------------------------------------------------
-- 11. Indexes for foreign keys and the RLS helpers
-- ---------------------------------------------------------------------------

create index if not exists members_user_id_lookup_idx on public.members (user_id) where user_id is not null;
create index if not exists posts_author_created_idx on public.posts (author_id, created_at desc);
create index if not exists posts_linked_event_idx on public.posts (linked_event_id) where linked_event_id is not null;
create index if not exists calendar_events_created_by_idx on public.calendar_events (created_by);
create index if not exists profiles_member_idx on public.profiles (member_id);
create index if not exists family_invitations_member_idx on public.family_invitations (member_id);
create index if not exists family_invitations_invited_by_idx on public.family_invitations (invited_by);
create index if not exists clinical_snapshots_family_idx on public.clinical_snapshots (family_id);
create index if not exists clinical_alerts_snapshot_idx on public.clinical_alerts (snapshot_id);
create index if not exists clinical_alerts_member_idx on public.clinical_alerts (member_id);
create index if not exists clinical_alerts_family_idx on public.clinical_alerts (family_id);
create index if not exists clinical_alerts_assigned_idx on public.clinical_alerts (assigned_to);
create index if not exists clinical_reports_family_idx on public.clinical_reports (family_id);
create index if not exists clinical_reports_reviewed_by_idx on public.clinical_reports (reviewed_by);
create index if not exists clinical_report_notifications_member_idx on public.clinical_report_notifications (member_id);
create index if not exists clinical_report_notifications_clinician_idx on public.clinical_report_notifications (clinician_id);

notify pgrst, 'reload schema';
