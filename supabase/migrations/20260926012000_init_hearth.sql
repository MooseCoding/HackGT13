-- Hearth core schema: families, members, posts, calendar, weekly digests.
-- RLS is on for every public table. Anon policies are intentionally open so the
-- hackathon demo can read/write without auth; lock this down before production.

create table public.families (
  id text primary key,
  name text not null,
  tagline text not null default ''
);

create table public.members (
  id text primary key,
  family_id text not null references public.families (id) on delete cascade,
  name text not null,
  role text not null,
  age integer not null,
  initials text not null,
  color text not null,
  location text not null,
  clinical_opt_in boolean not null default false,
  easy_mode_default boolean not null default false
);

create table public.posts (
  id text primary key,
  family_id text not null references public.families (id) on delete cascade,
  author_id text not null references public.members (id) on delete cascade,
  kind text not null check (kind in ('text', 'voice', 'photo', 'status')),
  body text not null default '',
  created_at timestamptz not null default now(),
  thread_id text,
  photo_url text,
  photo_alt text,
  voice_seconds integer,
  transcript text
);

create table public.calendar_events (
  id text primary key,
  family_id text not null references public.families (id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  attendees text[] not null default '{}',
  source_text text not null default '',
  created_by text not null references public.members (id)
);

create table public.digests (
  id text primary key,
  family_id text not null unique references public.families (id) on delete cascade,
  week_of text not null,
  title text not null,
  narrative text not null,
  highlights text[] not null default '{}',
  generated_at timestamptz not null default now()
);

create index posts_family_created_idx on public.posts (family_id, created_at desc);
create index posts_family_thread_idx on public.posts (family_id, thread_id);
create index members_family_idx on public.members (family_id);
create index events_family_starts_idx on public.calendar_events (family_id, starts_at);

alter table public.families enable row level security;
alter table public.members enable row level security;
alter table public.posts enable row level security;
alter table public.calendar_events enable row level security;
alter table public.digests enable row level security;

create policy "public read families" on public.families
  for select to anon, authenticated using (true);

create policy "public read members" on public.members
  for select to anon, authenticated using (true);

create policy "public read posts" on public.posts
  for select to anon, authenticated using (true);
create policy "public insert posts" on public.posts
  for insert to anon, authenticated with check (true);

create policy "public read events" on public.calendar_events
  for select to anon, authenticated using (true);
create policy "public insert events" on public.calendar_events
  for insert to anon, authenticated with check (true);

create policy "public read digests" on public.digests
  for select to anon, authenticated using (true);
create policy "public insert digests" on public.digests
  for insert to anon, authenticated with check (true);
create policy "public update digests" on public.digests
  for update to anon, authenticated using (true) with check (true);
create policy "public delete digests" on public.digests
  for delete to anon, authenticated using (true);

-- Seed helper: HackGT week is pinned to 2026-09-25 Eastern, matching src/lib/clock.ts.
create or replace function public.hearth_at_day(days_ago integer, hour integer, minute integer)
returns timestamptz
language sql
immutable
as $$
  select timezone(
    'America/New_York',
    ((date '2026-09-25' - days_ago) + make_time(hour, minute, 0))::timestamp
  );
$$;

insert into public.families (id, name, tagline) values
  ('alvarez', 'The Alvarez Circle', 'Atlanta · three generations · one hearth'),
  ('okonkwo', 'The Okonkwo Circle', 'Decatur · opted-in comparison patient');

insert into public.members (
  id, family_id, name, role, age, initials, color, location, clinical_opt_in, easy_mode_default
) values
  ('elena', 'alvarez', 'Elena Alvarez', 'Abuela', 78, 'EA', '#b45309', 'Grant Park', true, true),
  ('miguel', 'alvarez', 'Miguel Alvarez', 'Son', 52, 'MA', '#9a3412', 'Inman Park', false, false),
  ('priya', 'alvarez', 'Priya Alvarez', 'Daughter-in-law', 48, 'PA', '#7c2d12', 'Inman Park', false, false),
  ('sofia', 'alvarez', 'Sofia Alvarez', 'Granddaughter', 17, 'SA', '#c2410c', 'Grady High', false, false),
  ('james', 'alvarez', 'James Alvarez', 'Grandson (GT)', 21, 'JA', '#92400e', 'Georgia Tech', false, false),
  ('ruth', 'okonkwo', 'Ruth Okonkwo', 'Nana', 74, 'RO', '#0f766e', 'Decatur', true, false);

insert into public.posts (
  id, family_id, author_id, kind, body, created_at, thread_id, photo_url, photo_alt, voice_seconds, transcript
) values
  ('p1', 'alvarez', 'elena', 'text',
    $p$I spent the morning thinning the basil so the tomatoes can breathe. Miguel, the red ones on the south fence are ready if you want to come by Sunday. I put a chair in the shade for Priya.$p$,
    public.hearth_at_day(38, 9, 12), null, null, null, null, null),
  ('p2', 'alvarez', 'sofia', 'photo',
    $p$First varsity start this Saturday. Abuela you better be loud.$p$,
    public.hearth_at_day(36, 16, 40), null,
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
    'Sofia in a soccer jersey on the field', null, null),
  ('p3', 'alvarez', 'elena', 'voice', 'Voice note', public.hearth_at_day(36, 17, 5), null, null, null, 18,
    $p$Mija I am so proud of you. I will wear the yellow scarf your grandfather liked. Tell coach I still remember how to yell.$p$),
  ('p4', 'alvarez', 'james', 'photo',
    $p$Hackathon fuel. Miss kitchen table energy. Send empanadas via teleport.$p$,
    public.hearth_at_day(34, 22, 10), null,
    'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80',
    'Georgia Tech campus at dusk', null, null),
  ('p5', 'alvarez', 'priya', 'text',
    $p$Sunday lunch is at our place if the garden run happens. Elena, I'll pick you up at 11 so you don't have to drive.$p$,
    public.hearth_at_day(33, 11, 2), null, null, null, null, null),
  ('p6', 'alvarez', 'elena', 'text',
    $p$Thank you Priya. I am grateful we still sit down together. I made the salsa the way your mother likes, extra lime.$p$,
    public.hearth_at_day(33, 11, 40), null, null, null, null, null),
  ('p7', 'alvarez', 'miguel', 'status',
    $p$Dad's old radio is working again. Putting it on the porch for the game.$p$,
    public.hearth_at_day(28, 19, 15), null, null, null, null, null),
  ('p8', 'alvarez', 'elena', 'photo',
    $p$Harvest day. These tomatoes waited all summer. I want everyone to take a bag.$p$,
    public.hearth_at_day(27, 8, 50), null,
    'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1200&q=80',
    'Ripe tomatoes on a vine', null, null),
  ('p9', 'alvarez', 'sofia', 'text',
    $p$We won 2-1!!!! Abuela I heard you. The yellow scarf is famous now.$p$,
    public.hearth_at_day(22, 18, 3), null, null, null, null, null),
  ('p10', 'alvarez', 'elena', 'text',
    $p$I told you about the tomatoes. Did I already tell you about the tomatoes on the south fence.$p$,
    public.hearth_at_day(12, 23, 41), null, null, null, null, null),
  ('p11', 'alvarez', 'miguel', 'text',
    $p$Ma I got the tomatoes last Sunday. I'll come by tomorrow after work.$p$,
    public.hearth_at_day(12, 23, 55), null, null, null, null, null),
  ('p12', 'alvarez', 'elena', 'text',
    $p$Where is my purse. I can't find my purse. The tomatoes are ready.$p$,
    public.hearth_at_day(9, 1, 12), null, null, null, null, null),
  ('p13', 'alvarez', 'priya', 'text',
    $p$Elena, purse is on the hook by the blue door. James is coming home Friday for the digest dinner.$p$,
    public.hearth_at_day(9, 7, 20), null, null, null, null, null),
  ('p14', 'alvarez', 'james', 'text',
    $p$HackGT this weekend. I'll still be at dinner Friday if the demo doesn't explode. Love you Abuela.$p$,
    public.hearth_at_day(6, 21, 8), null, null, null, null, null),
  ('p15', 'alvarez', 'elena', 'voice', 'Voice note', public.hearth_at_day(5, 0, 47), null, null, null, 22,
    $p$The tomatoes. I told you about the tomatoes. Did I tell you about the tomatoes. Where is my purse.$p$),
  ('p16', 'alvarez', 'sofia', 'photo',
    $p$Post-practice leftovers. Abuela's salsa still slaps.$p$,
    public.hearth_at_day(4, 19, 30), null,
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
    'Family dinner plates on a table', null, null),
  ('p17', 'alvarez', 'elena', 'text',
    $p$The tomatoes are ready. The tomatoes. I can't find my purse.$p$,
    public.hearth_at_day(2, 23, 18), null, null, null, null, null),
  ('p18', 'alvarez', 'miguel', 'text',
    $p$Reminder: Saturday 10am soccer tournament at Piedmont. I'll drive Elena.$p$,
    public.hearth_at_day(1, 12, 4), null, null, null, null, null),
  ('p19', 'alvarez', 'elena', 'status',
    $p$I am tired. The tomatoes. Goodnight.$p$,
    public.hearth_at_day(0, 1, 6), null, null, null, null, null),
  ('dm1', 'alvarez', 'elena', 'text',
    $p$Mijo, can you pick up tomatoes Sunday? The red ones on the south fence.$p$,
    public.hearth_at_day(3, 10, 15), 'dm:elena:miguel', null, null, null, null),
  ('dm2', 'alvarez', 'miguel', 'text',
    $p$Yes Ma. I'll bring Priya too.$p$,
    public.hearth_at_day(3, 10, 42), 'dm:elena:miguel', null, null, null, null),
  ('dm3', 'alvarez', 'elena', 'text',
    $p$Gracias. Don't forget the chair for my knees.$p$,
    public.hearth_at_day(3, 11, 5), 'dm:elena:miguel', null, null, null, null),
  ('dm4', 'alvarez', 'priya', 'text',
    $p$Elena, your purse is on the hook by the blue door.$p$,
    public.hearth_at_day(1, 8, 30), 'dm:elena:priya', null, null, null, null),
  ('dm5', 'alvarez', 'elena', 'text',
    $p$Thank you mija. I looked everywhere.$p$,
    public.hearth_at_day(1, 8, 55), 'dm:elena:priya', null, null, null, null),
  ('dm6', 'alvarez', 'james', 'text',
    $p$You better score tomorrow. I'll be watching from GT.$p$,
    public.hearth_at_day(2, 19, 10), 'dm:james:sofia', null, null, null, null),
  ('dm7', 'alvarez', 'sofia', 'text',
    $p$Obviously. Tell Abuela to wear the yellow scarf.$p$,
    public.hearth_at_day(2, 19, 22), 'dm:james:sofia', null, null, null, null),
  ('r0', 'okonkwo', 'ruth', 'text',
    $p$Choir rehearsal ran long but my voice held. I wrote Ada a note about Sunday stew so she does not worry.$p$,
    public.hearth_at_day(28, 9, 10), null, null, null, null, null),
  ('r1', 'okonkwo', 'ruth', 'text',
    $p$Book club chose Another Country. I am hosting next Thursday so the porch lights will be on early. Ada is bringing jollof.$p$,
    public.hearth_at_day(20, 10, 15), null, null, null, null, null),
  ('r2', 'okonkwo', 'ruth', 'text',
    $p$Walked the beltline with the girls. My knee behaved. Grateful for a quiet, ordinary morning.$p$,
    public.hearth_at_day(14, 8, 40), null, null, null, null, null),
  ('r3', 'okonkwo', 'ruth', 'text',
    $p$Made groundnut stew and froze two portions for Sunday. Call me when you land, Kojo.$p$,
    public.hearth_at_day(7, 11, 5), null, null, null, null, null),
  ('r4', 'okonkwo', 'ruth', 'text',
    $p$Finished the novel. We argued about the ending for an hour and then laughed. I love a house that is loud on purpose.$p$,
    public.hearth_at_day(2, 16, 22), null, null, null, null, null);

insert into public.calendar_events (
  id, family_id, title, starts_at, location, attendees, source_text, created_by
) values
  ('e1', 'alvarez', 'Sofia''s soccer tournament', '2026-09-26T10:00:00-04:00', 'Piedmont Park',
    array['sofia', 'elena', 'miguel', 'priya'],
    'Sarah has her soccer tournament this Saturday at 10 AM', 'miguel'),
  ('e2', 'alvarez', 'Friday digest dinner', '2026-09-25T18:30:00-04:00', 'Miguel & Priya''s kitchen',
    array['elena', 'miguel', 'priya', 'sofia', 'james'],
    'digest dinner Friday 6:30 at our place', 'priya'),
  ('e3', 'alvarez', 'Sunday garden pickup', '2026-09-27T11:00:00-04:00', 'Elena''s south fence',
    array['elena', 'miguel', 'priya'],
    'Sunday 11 pick up Elena for tomatoes', 'priya');

drop function public.hearth_at_day(integer, integer, integer);
