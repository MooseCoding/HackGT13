-- Persisted clinical operations: clinician authorization, analysis runs,
-- longitudinal snapshots, and a reviewable alert lifecycle.

alter table public.profiles
  add column if not exists account_role text not null default 'family'
    check (account_role in ('family', 'clinician', 'admin'));

-- Users may edit ordinary profile fields, but cannot promote themselves.
revoke update on public.profiles from authenticated;
grant update (family_id, member_id, display_name) on public.profiles to authenticated;

create or replace function public.is_clinician()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.account_role in ('clinician', 'admin')
  );
$$;

grant execute on function public.is_clinician() to authenticated;

create table if not exists public.clinical_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  patient_count integer not null default 0,
  queued_count integer not null default 0,
  error text
);

create table if not exists public.clinical_snapshots (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.clinical_analysis_runs(id) on delete cascade,
  member_id text not null references public.members(id) on delete cascade,
  family_id text not null references public.families(id) on delete cascade,
  risk_level text not null check (risk_level in ('stable', 'monitor', 'priority')),
  confidence text not null check (confidence in ('low', 'moderate', 'high')),
  assessed_at timestamptz not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (run_id, member_id)
);

create index if not exists clinical_snapshots_member_assessed_idx
  on public.clinical_snapshots(member_id, assessed_at desc);

create table if not exists public.clinical_alerts (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.clinical_snapshots(id) on delete cascade,
  member_id text not null references public.members(id) on delete cascade,
  family_id text not null references public.families(id) on delete cascade,
  risk_level text not null check (risk_level in ('monitor', 'priority')),
  status text not null default 'new' check (status in ('new', 'reviewing', 'contacted', 'dismissed')),
  fingerprint text not null,
  title text not null,
  summary text not null,
  suggested_action text not null,
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists clinical_alerts_status_created_idx
  on public.clinical_alerts(status, created_at desc);

create unique index if not exists clinical_alerts_active_fingerprint_idx
  on public.clinical_alerts(member_id, fingerprint)
  where status in ('new', 'reviewing');

alter table public.clinical_analysis_runs enable row level security;
alter table public.clinical_snapshots enable row level security;
alter table public.clinical_alerts enable row level security;

create policy "clinicians read analysis runs" on public.clinical_analysis_runs
  for select to authenticated using (public.is_clinician());
create policy "clinicians read snapshots" on public.clinical_snapshots
  for select to authenticated using (public.is_clinician());
create policy "clinicians read alerts" on public.clinical_alerts
  for select to authenticated using (public.is_clinician());
create policy "clinicians update alerts" on public.clinical_alerts
  for update to authenticated using (public.is_clinician()) with check (public.is_clinician());

notify pgrst, 'reload schema';
