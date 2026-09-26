-- Structured mailing address on members (location stays as a display summary).
alter table public.members
  add column if not exists street text not null default '',
  add column if not exists apt text not null default '',
  add column if not exists city text not null default '',
  add column if not exists state text not null default '',
  add column if not exists postal_code text not null default '',
  add column if not exists country text not null default 'United States';
