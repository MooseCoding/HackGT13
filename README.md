# Familyr

**A digital living room for families, with an opt-in clinician channel.** Built at HackGT 13.

Families share messages, photos, voice notes and plans in one calm place. Each week, **Hestia** turns the week into a short story, so nobody has to scroll the whole group thread. If a family member chooses to share, a clinician can see gentle, explainable signs that the way that person communicates has changed. Each person is compared only with their own past, never with a population average.

> Familyr provides clinical decision support. It does not diagnose, it is not a medical device, and a clinician must confirm every signal.

---

## Contents

- [What's inside](#whats-inside)
- [Quick start](#quick-start)
- [Demo mode vs live mode](#demo-mode-vs-live-mode)
- [Environment variables](#environment-variables)
- [Supabase setup](#supabase-setup)
- [Deploying](#deploying)
- [Security and privacy model](#security-and-privacy-model)
- [How the clinical engine works](#how-the-clinical-engine-works)
- [Project structure](#project-structure)
- [Scripts](#scripts)
- [More docs](#more-docs)

---

## What's inside

| Surface | Route | What it does |
| --- | --- | --- |
| Landing | `/` | Google sign-in, or **Preview the demo family** |
| Onboarding | `/onboarding` | Create a Circle or join one with an invite code |
| Family chat | `/family` | Group chat and DMs, photos, voice notes, **Add member** invites, Familyr Assistant |
| Calendar | `/family/calendar` | Create events in plain English ("Sofia's game Saturday 10am at Piedmont"), RSVPs, bring-lists, Google Calendar sync |
| Reminders | `/family/reminders` | Reminders pulled from chat and the calendar |
| Hestia | `/family/digest` | The weekly story for the Circle, with listen-aloud |
| Circle and settings | `/family/circle`, `/family/settings/*` | Members, clinician sharing, insurance, Larger text |
| Invite link | `/invite/[token]` | Accept an emailed invite and join a Circle |
| Clinician portal | `/hcp`, `/hcp/patients/[id]` | Review queue, patient roster, pre-visit brief with evidence |
| Live signal demo | `/hcp/live` | Deterministic walkthrough of WhatsApp intake, for use when venue Wi-Fi fails |

**Words we use:** *Familyr* is the product. *Hestia* is the weekly story. A *Circle* is one household, and *Family* is the people in it. *Larger text* is the accessibility mode. *Familyr Assistant* is the in-app helper; it is not Hestia.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Auth, Postgres, row-level security, Realtime) · Meta Muse with a Grok fallback for generation · ElevenLabs for voice in/out (Groq Whisper STT fallback) · deployed on Vercel.

---

## Quick start

Requires Node 20 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000> and click **Preview the demo family**. You need no accounts and no API keys to try the full app.

---

## Demo mode vs live mode

| | Demo mode | Live mode |
| --- | --- | --- |
| Data | In memory, seeded from `src/lib/seed.ts` (the Alvarez and Okonkwo Circles) | Your Supabase project |
| Sign-in | None | Google through Supabase Auth |
| When it's on | Supabase keys are missing, you clicked **Preview the demo family**, or `NEXT_PUBLIC_DEMO_MODE=true` | Supabase keys are set and you signed in with Google (signing in clears demo mode) |
| Resets | On server restart | Never. Data persists. |

Demo mode never reads or writes the database, so it is safe to show in public.

---

## Environment variables

Copy `.env.example` to `.env.local`. Only the first group is needed for live mode.

**Core (live mode)**

| Variable | Where it's used | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server | Public key. Row-level security protects the data. |
| `NEXT_PUBLIC_SITE_URL` | Server | Base URL for OAuth redirects and invite links |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Used by the clinical workers, the clinician portal and the WhatsApp webhook. **Never prefix it with `NEXT_PUBLIC_`.** |
| `CRON_SECRET` | Server only | Protects `/api/clinical/*` cron endpoints. Required in production. |
| `HCP_CLINICIAN_EMAILS` | Server only | Comma-separated emails that get clinician access |

**AI (optional; local fallbacks run without these)**

| Variable | Purpose |
| --- | --- |
| `MODEL_API_KEY`, `AI_MODEL`, `AI_API_BASE` | Meta Muse, the main model for Hestia, Familyr Assistant and clinician briefs |
| `GROK_API_KEY`, `GROK_MODEL`, `GROK_API_BASE` | Grok, used when Muse is unavailable. `AI_PROVIDER_MODE=grok` forces it. |
| `ELEVENLABS_API_KEY` | Primary voice: TTS (Family Radio / Listen) and STT (WhatsApp + clinical voice notes). Needs Text to Speech + Speech to Text. |
| `GROQ_API_KEY`, `GROQ_TRANSCRIPTION_MODEL` | Whisper STT fallback only when ElevenLabs is unset or fails |

**Integrations (optional)**

| Variable | Purpose |
| --- | --- |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | The **Connect Google Calendar** button |
| `RESEND_API_KEY`, `CLINICAL_EMAIL_FROM` | Sending clinician report emails. Without these, the app opens a labeled `mailto:` preview instead. |
| `WHATSAPP_*` | WhatsApp Business intake. See [Ambient WhatsApp intake](#ambient-whatsapp-and-voice-intake). |
| `BACKBOARD_API_KEY` | Long-term memory for Familyr Assistant. See [Backboard and TigerData](#backboard-and-tigerdata). |
| `TIGERDATA_DATABASE_URL` | Time-series history of clinical metrics. See [Backboard and TigerData](#backboard-and-tigerdata). |

---

## Supabase setup

The schema lives in [`supabase/migrations/`](./supabase/migrations). Apply migrations in order and never edit one that has already been applied.

**1. Link the project and apply migrations**

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

**2. Turn on Google sign-in.** In the Supabase dashboard, go to **Authentication → Providers → Google** and add a Google Cloud OAuth client. Then, under **Authentication → URL Configuration**:

- Site URL: your deployed URL (use `http://localhost:3000` for local development)
- Redirect URLs: `http://localhost:3000/auth/callback` and `https://<your-domain>/auth/callback`

In Google Cloud, set the OAuth client's redirect URI to `https://<project-ref>.supabase.co/auth/v1/callback`.

**3. Give someone clinician access.** Either add their email to `HCP_CLINICIAN_EMAILS` (the database role is set automatically the next time they sign in), or run this in the SQL editor:

```sql
update public.profiles set account_role = 'clinician'
where id = (select id from auth.users where email = 'doctor@example.com');
```

**4. Optional: test data.** [`supabase/test_signal.sql`](./supabase/test_signal.sql) creates a realistic baseline and a recent change for one member, so you can exercise the clinician queue. Use it only in a test project.

---

## Deploying

1. Import the repo into Vercel and add the environment variables above. Put `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` in the **Production** environment.
2. Run `npx supabase db push` against the production project **before** deploying code that depends on a new migration.
3. `vercel.json` schedules `/api/clinical/analyze` daily at 12:00 UTC. Vercel sends `CRON_SECRET` automatically.
4. The weekly clinician brief job (`/api/clinical/reports/weekly`) is **not scheduled yet**. Add it to `vercel.json` if you want it to run automatically.
5. After deploying, open `/api/health/supabase`. It should report `configured: true`.

**Production checklist**

- [ ] All migrations applied (`npx supabase migration list` shows no pending ones)
- [ ] Google redirect URLs include the production domain
- [ ] `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` are set and are not `NEXT_PUBLIC_`
- [ ] `WHATSAPP_APP_SECRET` is set if the webhook is live (unsigned requests are rejected in production)
- [ ] Point-in-time recovery or daily backups are on in Supabase

---

## Security and privacy model

Every table has row-level security, and **signed-out visitors can read and write nothing**. The rules are enforced in Postgres, not only in the app:

- **Circles.** You can see a Circle only if you are a member of it. Any member can change Circle settings, but only the owner can rename it, and ownership can't be transferred through the API.
- **Members.** You can't move your member profile into another Circle or link it to another account. New member placeholders created for invites start unclaimed.
- **Posts.** You post as yourself. A Circle owner can also post for a member who has no account yet, such as a grandparent. Only the signature-checked webhook can write WhatsApp or phone posts, so voice signals can't be faked from a browser.
- **Invites.** An invite can point only at an unclaimed member of the same Circle. Invites expire after 14 days and can be revoked, but not edited.
- **Profiles.** Users can change only their display name. Roles such as `clinician` are assigned by the server.
- **Clinical sharing is the member's own choice.** Nobody else can opt a person in once they have claimed their profile, except that the Circle owner can set it for a member with no account yet. A clinician sees a patient only while that patient is opted in, and only if another clinician hasn't already claimed them. **Opting out takes effect immediately**: the clinician assignment is released and open alerts are closed.
- **Clinical records.** Clinicians can mark alerts as reviewed and sign reports as themselves, but they can't edit what was generated. Analysis runs are written only by the server.

The hardening rules are in [`20260927010000_production_hardening.sql`](./supabase/migrations/20260927010000_production_hardening.sql).

---

## Backboard and TigerData

Both are optional, focused add-ons. Supabase stays the source of truth for users, Circles, posts, calendar, reminders, permissions and all clinical records. With their keys unset, the app behaves exactly as before.

| Service | Owns | Does not own |
| --- | --- | --- |
| Supabase | Auth, Circles, members, posts, calendar, reminders, RLS, clinical snapshots, alerts, assignments, reports | — |
| Backboard | Familyr Assistant's long-term memory | Anything the app reads as fact |
| TigerData | Per-message clinical metric history, recent-vs-baseline aggregation | Flags, risk levels, alerts |
| Muse / Grok | Reasoning and writing | — |
| ElevenLabs | TTS (Family Radio / Listen) and primary STT | — |
| Groq | Whisper STT fallback | — |

**Backboard: assistant memory.** Each Circle gets one Backboard assistant, named `familyr-circle-<id>`. When someone asks Familyr Assistant something, the app loads the usual context from Supabase, then searches Backboard for relevant long-term notes, such as "Grandma prefers afternoon appointments". It passes both to Muse or Grok. After replying, it saves the member's own message to Backboard so durable facts can be extracted. Tool calls and the draft-then-confirm flow are unchanged. The extraction prompt tells Backboard to skip health, clinical and contact details. Code: `src/lib/integrations/backboard.ts`, wired in `src/app/api/assistant/route.ts`.

**TigerData: clinical time-series.** During the daily analysis run, each opted-in member's messages are turned into one row per metric (word count, vocabulary variety, sentence length, sentiment, posting hour, voice pace and pauses) and written to a TigerData hypertable. TigerData then computes each metric's 14-day average against the previous 30 days, and that summary is saved with the Supabase snapshot as `snapshot.timeseries`. The existing engine still decides flags and risk. The patient page's trend chart reads daily points from TigerData when data is available. People who opt out have their metric history deleted on the next run. Code: `src/lib/integrations/tigerdata.ts`; schema: [`tigerdata/schema.sql`](./tigerdata/schema.sql).

---

## How the clinical engine works

1. **Collect.** The engine reads messages only from opted-in members. It derives metrics such as lexical diversity, sentence length, repetition, sentiment range, posting-hour shifts, response latency and engagement cadence, plus speech pace and pauses for voice notes.
2. **Compare.** It compares the latest 14 days with that person's own previous 30-day baseline.
3. **Triage.** A daily worker saves a snapshot for each patient and opens a deduplicated alert when there is a sustained shift (`monitor` or `priority`). A single worrying message can prompt a gentle family check-in, but it never creates an alert on its own.
4. **Review.** Clinicians move alerts through `new → reviewing → contacted / dismissed`. They can generate an evidence-linked brief that stays a draft until someone reviews it.

Changes can reflect language, device access, travel, illness or a family's normal habits. That is why every output is decision support that a clinician must confirm.

### Ambient WhatsApp and voice intake

- Set Meta's WhatsApp Business webhook callback to `https://<your-domain>/api/webhooks/whatsapp` and fill in the `WHATSAPP_*` variables.
- Map senders to members explicitly with `WHATSAPP_PATIENT_MAP` (`{"14045550123":"member-id"}`). Senders who aren't mapped, or haven't opted in, are ignored.
- Voice notes are transcribed with ElevenLabs Scribe (Groq Whisper fallback) and reduced to timing features. Familyr does not store the original audio.

---

## Project structure

```
src/
  app/                 Routes (App Router)
    api/               Route handlers: posts, events, digest, invitations, clinical/*, webhooks/*
    family/            Family app pages
    hcp/               Clinician portal
  components/          UI by area (family/, hcp/, home/, onboarding/, settings/)
  lib/
    data.ts            Data layer: switches between the demo store and Supabase
    store.ts, seed.ts  In-memory demo store and seed Circles
    auth.ts            Session, profile and clinician checks
    supabase/          Browser, server and service-role clients, plus generated types
    ai/                Muse and Grok clients, prompts, Hestia and Familyr Assistant
    clinical/          Analysis, operations, reports, WhatsApp intake
  proxy.ts             Session refresh and route gating (Next.js 16 middleware)
supabase/migrations/   Database schema and policies
eval/hcp-brief/        Evaluation set for clinician briefs (synthetic data)
```

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server on port 3000 |
| `npm run build` / `npm start` | Production build and serve |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run eval:hcp` | Generate synthetic cases and score clinician briefs |

---

## More docs

- [`DEMO_RUNBOOK.md`](./DEMO_RUNBOOK.md): the 90-second judging path, two-profile rehearsal and backup recording
- [`HACKATHON_REPORT.md`](./HACKATHON_REPORT.md): what's built and what's still fragile
- [`eval/hcp-brief/README.md`](./eval/hcp-brief/README.md): brief evaluation sources and method
- [`AGENTS.md`](./AGENTS.md): notes for coding agents, including the copy rules

## License

MIT. See [`LICENSE`](./LICENSE).
