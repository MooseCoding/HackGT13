-- Auditable, confirmation-gated clinician report notifications.
create table if not exists public.clinical_report_notifications (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.clinical_reports(id) on delete cascade,
  member_id text not null references public.members(id) on delete cascade,
  clinician_id uuid not null references auth.users(id) on delete cascade,
  recipient_email text not null,
  delivery_mode text not null check (delivery_mode in ('email', 'mailto_preview')),
  delivery_status text not null check (delivery_status in ('pending', 'sent', 'preview_ready', 'failed')),
  provider_message_id text,
  created_at timestamptz not null default now()
);

create index if not exists clinical_report_notifications_report_idx
  on public.clinical_report_notifications(report_id, created_at desc);

alter table public.clinical_report_notifications enable row level security;

drop policy if exists "clinicians read own report notifications" on public.clinical_report_notifications;
create policy "clinicians read own report notifications" on public.clinical_report_notifications
  for select to authenticated using (clinician_id = auth.uid() and public.is_clinician());

drop policy if exists "clinicians create own report notifications" on public.clinical_report_notifications;
create policy "clinicians create own report notifications" on public.clinical_report_notifications
  for insert to authenticated with check (clinician_id = auth.uid() and public.is_clinician());

drop policy if exists "clinicians update own report notifications" on public.clinical_report_notifications;
create policy "clinicians update own report notifications" on public.clinical_report_notifications
  for update to authenticated using (clinician_id = auth.uid() and public.is_clinician())
  with check (clinician_id = auth.uid() and public.is_clinician());

notify pgrst, 'reload schema';
