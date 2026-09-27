-- Evidence-linked Muse clinician reports. Reports remain drafts until a
-- clinician explicitly reviews them.

create table if not exists public.clinical_reports (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.clinical_snapshots(id) on delete cascade,
  member_id text not null references public.members(id) on delete cascade,
  family_id text not null references public.families(id) on delete cascade,
  brief text not null,
  findings jsonb not null default '[]'::jsonb,
  recommended_next_step text not null,
  evidence_ids text[] not null default '{}',
  model_provider text not null check (model_provider in ('muse', 'grok', 'local')),
  model_name text not null,
  prompt_version text not null,
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'signed')),
  generated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

create index if not exists clinical_reports_member_generated_idx
  on public.clinical_reports(member_id, generated_at desc);

create unique index if not exists clinical_reports_snapshot_prompt_idx
  on public.clinical_reports(snapshot_id, prompt_version);

alter table public.clinical_reports enable row level security;

drop policy if exists "clinicians read clinical reports" on public.clinical_reports;
create policy "clinicians read clinical reports" on public.clinical_reports
  for select to authenticated using (public.is_clinician());

drop policy if exists "clinicians insert clinical reports" on public.clinical_reports;
create policy "clinicians insert clinical reports" on public.clinical_reports
  for insert to authenticated with check (public.is_clinician());

drop policy if exists "clinicians update clinical reports" on public.clinical_reports;
create policy "clinicians update clinical reports" on public.clinical_reports
  for update to authenticated using (public.is_clinician()) with check (public.is_clinician());

notify pgrst, 'reload schema';
