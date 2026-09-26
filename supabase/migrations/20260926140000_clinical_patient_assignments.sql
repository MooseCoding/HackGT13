-- PCP patient roster: each opted-in patient may be assigned to one clinician.
-- Idempotent: safe if policies already exist.

create table if not exists public.clinical_patient_assignments (
  member_id text primary key references public.members(id) on delete cascade,
  clinician_id uuid not null references auth.users(id) on delete cascade,
  assigned_at timestamptz not null default now()
);

create index if not exists clinical_patient_assignments_clinician_idx
  on public.clinical_patient_assignments(clinician_id);

alter table public.clinical_patient_assignments enable row level security;

drop policy if exists "clinicians read patient assignments" on public.clinical_patient_assignments;
create policy "clinicians read patient assignments" on public.clinical_patient_assignments
  for select to authenticated using (public.is_clinician());

drop policy if exists "clinicians assign patients" on public.clinical_patient_assignments;
create policy "clinicians assign patients" on public.clinical_patient_assignments
  for insert to authenticated
  with check (public.is_clinician() and clinician_id = auth.uid());

drop policy if exists "clinicians release own patients" on public.clinical_patient_assignments;
create policy "clinicians release own patients" on public.clinical_patient_assignments
  for delete to authenticated
  using (public.is_clinician() and clinician_id = auth.uid());

notify pgrst, 'reload schema';
