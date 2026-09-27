# Familyr

**A digital living room for families, with an opt-in clinician channel.** Built at HackGT 13.

Families share messages, photos, voice notes, and plans in one calm place. Each week, **Hestia** turns the Circle’s activity into a short story so nobody has to scroll the whole thread. When someone opts in, a clinician can review gentle, explainable shifts in how that person communicates — always versus **their own baseline**, never a population average.

> Familyr is clinical decision support. It does not diagnose, it is not a medical device, and a clinician must confirm every signal.

**Story in one line:** family conversation → useful AI action → longitudinal signal → clinician context.

---

## Contents

- [What's inside](#whats-inside)
- [Quick start](#quick-start)
- [Demo mode vs live mode](#demo-mode-vs-live-mode)
- [HackGT pitch deck](#hackgt-pitch-deck)
- [Environment variables](#environment-variables)
- [Supabase setup](#supabase-setup)
- [Deploying](#deploying)
- [Security and privacy model](#security-and-privacy-model)
- [Backboard and TigerData](#backboard-and-tigerdata)
- [How the clinical engine works](#how-the-clinical-engine-works)
- [Project structure](#project-structure)
- [Scripts](#scripts)
- [More docs](#more-docs)

---

## What's inside

| Surface | Route | What it does |
| --- | --- | --- |
| Landing | `/` | Sign up / sign in, or **Try the demo** |
| Onboarding | `/onboarding` | Create a Circle or join with an invite code |
| Family chat | `/family` | Group chat and DMs, photos, voice notes, reactions, **Add member** invites, Familyr Assistant |
| Calendar | `/family/calendar` | Plain-English events, RSVPs, bring-lists, Google Calendar sync |
| Reminders | `/family/reminders` | Reminders pulled from chat and the calendar |
| Hestia | `/family/digest` | Weekly story for the Circle, with Listen (ElevenLabs when configured) |
| Circle and settings | `/family/circle`, `/family/settings/*` | Members, clinician sharing, insurance, Larger text |
| Invite link | `/invite/[token]` | Accept an invite and join a Circle |
| Clinician portal | `/hcp`, `/hcp/patients/[id]` | Review queue, voice metrics vs baseline, evidence, downloadable brief |
| Live signal | `/hcp/live` | One-click sustained-shift demo (WhatsApp → voice → baseline) when Wi‑Fi fails |
| Eval cases | `/hcp/eval` | Three golden synthetic HCP cases for judges |
| Pitch deck | `/pitch` | 55-second HackGT speaker deck (`←` `→`, `F` fullscreen, `N` notes) |

**Words we use:** *Familyr* is the product. *Hestia* is the weekly story. A *Circle* is one household. *Larger text* is accessibility mode. *Familyr Assistant* is the in-app helper; it is not Hestia.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Auth, Postgres, RLS, Realtime) · Meta Muse (Grok fallback) · ElevenLabs voice in/out (Groq Whisper STT fallback) · Backboard · TigerData · Vercel.

---

## Quick start

Requires Node 20+.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000> and click **Try the demo**. No accounts or API keys are required for the full demo path.

For the clinician surfaces in demo mode, open `/hcp` after **Try the demo** (that sets the `hearth-demo=1` cookie the proxy expects).

---

## Demo mode vs live mode

| | Demo mode | Live mode |
| --- | --- | --- |
| Data | In memory, seeded from `src/lib/seed.ts` (Alvarez and Okonkwo Circles) | Your Supabase project |
| Sign-in | None | Google through Supabase Auth |
| When it's on | You clicked **Try the demo**, `NEXT_PUBLIC_DEMO_MODE=true`, or Supabase keys are missing | Supabase keys are set and you signed in with Google (signing in clears demo mode) |
| Resets | On server restart | Never — data persists |

Demo mode never reads or writes the database, so it is safe to show in public.

---

## HackGT pitch deck

Open **`/pitch`** for a six-slide, ~55s speaker-support deck:

1. Hook — everyday family signals  
2. Meet Familyr — one place for family life  
3. Agent action — calendar draft/confirm from chat  
4. Clinical intelligence — personal baseline pipeline  
5. Clinician workflow — evidence, brief, download  
6. Close — sponsors strip  

Cue card: [`pitch/SPEAKER.md`](./pitch/SPEAKER.md). Longer talk track: [`WINNING_PITCH.md`](./WINNING_PITCH.md). Judging choreography: [`DEMO_RUNBOOK.md`](./DEMO_RUNBOOK.md).

---

## Environment variables

Copy `.env.example` to `.env.local`. Only the core group is required for live mode.

**Core (live mode)**

| Variable | Where | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server | Public key; RLS protects data |
| `NEXT_PUBLIC_SITE_URL` | Server | Base URL for OAuth and invite links |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Clinical workers, HCP portal, WhatsApp webhook. Never `NEXT_PUBLIC_` |
| `CRON_SECRET` | Server only | Protects `/api/clinical/*` cron endpoints in production |
| `HCP_CLINICIAN_EMAILS` | Server only | Comma-separated emails that get clinician access |

**AI and voice (optional; local fallbacks run without these)**

| Variable | Purpose |
| --- | --- |
| `MODEL_API_KEY`, `AI_MODEL`, `AI_API_BASE` | Meta Muse — Hestia, Familyr Assistant, clinician briefs |
| `GROK_API_KEY`, `GROK_MODEL`, `GROK_API_BASE` | Grok when Muse is unavailable (`AI_PROVIDER_MODE=grok` forces it) |
| `ELEVENLABS_API_KEY` | Primary TTS (Listen / Family Radio) and STT (WhatsApp + clinical voice). Needs Text to Speech + Speech to Text |
| `GROQ_API_KEY`, `GROQ_TRANSCRIPTION_MODEL` | Whisper STT fallback only when ElevenLabs is unset or fails |

**Integrations (optional)**

| Variable | Purpose |
| --- | --- |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | **Connect Google Calendar** |
| `RESEND_API_KEY`, `CLINICAL_EMAIL_FROM` | Clinician report email; otherwise labeled `mailto:` preview |
| `WHATSAPP_*` | WhatsApp Business intake — see [Ambient WhatsApp](#ambient-whatsapp-and-voice-intake) |
| `BACKBOARD_API_KEY` | Long-term memory for Familyr Assistant |
| `TIGERDATA_DATABASE_URL` | Time-series store for clinical communication metrics |

Quick health check when keys are set:

```bash
npm run check:integrations
```

---

## Supabase setup

Schema lives in [`supabase/migrations/`](./supabase/migrations). Apply in order; never edit an already-applied migration.

**1. Link and push**

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

**2. Google sign-in.** Supabase → **Authentication → Providers → Google**, then **URL Configuration**:

- Site URL: production URL (or `http://localhost:3000`)
- Redirect URLs: `http://localhost:3000/auth/callback` and `https://<your-domain>/auth/callback`

In Google Cloud, set the OAuth client redirect to `https://<project-ref>.supabase.co/auth/v1/callback`.

**3. Clinician access.** Add the email to `HCP_CLINICIAN_EMAILS`, or:

```sql
update public.profiles set account_role = 'clinician'
where id = (select id from auth.users where email = 'doctor@example.com');
```

**4. Optional test signal.** [`supabase/test_signal.sql`](./supabase/test_signal.sql) seeds a baseline + recent shift for one member. Use only in a test project.

---

## Deploying

1. Import the repo into Vercel and set the env vars above. Keep `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` in **Production** only.
2. Run `npx supabase db push` on the production project **before** shipping code that needs a new migration.
3. `vercel.json` schedules `/api/clinical/analyze` daily at 12:00 UTC (`CRON_SECRET` is sent automatically).
4. The weekly brief job (`/api/clinical/reports/weekly`) is not scheduled yet — add it to `vercel.json` if you want it automatic.
5. After deploy, `/api/health/supabase` should report `configured: true`.

**Production checklist**

- [ ] Migrations applied (`npx supabase migration list` shows nothing pending)
- [ ] Google redirect URLs include the production domain
- [ ] `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` set, not `NEXT_PUBLIC_`
- [ ] `WHATSAPP_APP_SECRET` set if the webhook is live
- [ ] Point-in-time recovery or daily backups on in Supabase

---

## Security and privacy model

Every table has row-level security. **Signed-out visitors can read and write nothing.** Rules are enforced in Postgres, not only in the app:

- **Circles.** Visible only to members. Only the owner can rename; ownership is not transferable via the API.
- **Members.** You cannot move your profile into another Circle or link it to another account. Invite placeholders start unclaimed.
- **Posts.** You post as yourself. A Circle owner may post for an unclaimed member (e.g. a grandparent). Only the signature-checked webhook can write WhatsApp/phone posts.
- **Invites.** Point only at unclaimed members of the same Circle; expire in 14 days; revocable, not editable.
- **Profiles.** Users can change display name only. Roles such as `clinician` are server-assigned.
- **Clinical sharing is the member’s choice.** Once claimed, nobody else can opt them in (owner may set it for unclaimed members). Opt-out releases the clinician assignment and closes open alerts immediately.
- **Clinical records.** Clinicians can review alerts and sign reports as themselves; they cannot edit generated content. Analysis runs are server-written only.

Hardening migration: [`20260927010000_production_hardening.sql`](./supabase/migrations/20260927010000_production_hardening.sql).

---

## Backboard and TigerData

Optional add-ons. Supabase remains source of truth for users, Circles, posts, calendar, reminders, permissions, and clinical records. With keys unset, the app behaves as before.

| Service | Owns | Does not own |
| --- | --- | --- |
| Supabase | Auth, Circles, members, posts, calendar, reminders, RLS, clinical snapshots, alerts, assignments, reports | — |
| Backboard | Familyr Assistant long-term memory | Anything the app treats as fact |
| TigerData | Per-message clinical metric history, recent-vs-baseline aggregation | Flags, risk levels, alerts |
| Muse / Grok | Reasoning and writing | — |
| ElevenLabs | TTS + primary STT | — |
| Groq | Whisper STT fallback | — |

**Backboard.** One assistant per Circle (`familyr-circle-<id>`). Assistant turns load Supabase context, search durable notes (e.g. “Grandma prefers afternoon appointments”), then reply via Muse/Grok. Member messages can be saved for extraction; the prompt skips health, clinical, and contact details. Code: `src/lib/integrations/backboard.ts`.

**TigerData.** Daily analysis writes per-message metrics (including voice pace, pause, hesitation) into a hypertable, aggregates 14 vs 30 days, and attaches `snapshot.timeseries`. The patient trend chart prefers TigerData when available. Opt-out deletes metric history on the next run. Code: `src/lib/integrations/tigerdata.ts`; schema: [`tigerdata/schema.sql`](./tigerdata/schema.sql).

---

## How the clinical engine works

1. **Collect.** Messages from opted-in members only. Metrics include lexical diversity, sentence length, repetition, sentiment range, posting-hour shifts, reply latency, engagement cadence, plus speech pace, pause share, and hesitation for voice notes.
2. **Compare.** Latest 14 days vs that person’s prior 30-day baseline.
3. **Triage.** Daily worker saves a snapshot and opens a deduplicated alert on a sustained shift (`monitor` or `priority`). One hard day alone does not create an alert.
4. **Review.** Clinicians move alerts through `new → reviewing → contacted / dismissed`, inspect evidence (message text withheld), and download a weekly screening brief.

The patient page surfaces **exact feature deltas** (current vs usual) and, when voice samples exist, **Voice signals** (WPM / pause / hesitation). Briefs and Muse tools carry those numbers for explainability.

### Ambient WhatsApp and voice intake

- Webhook: `https://<your-domain>/api/webhooks/whatsapp` with `WHATSAPP_*` filled in.
- Map senders with `WHATSAPP_PATIENT_MAP` (`{"14045550123":"member-id"}`). Unmapped or non-opted-in senders are ignored.
- Voice notes are transcribed with **ElevenLabs Scribe** (Groq Whisper fallback), reduced to timing features, and may show a **WhatsApp** badge in chat. Original audio is not kept.

---

## Project structure

```
src/
  app/                 Routes (App Router)
    api/               posts, events, digest, invitations, clinical/*, tts, webhooks/*
    family/            Family app pages
    hcp/               Clinician portal (+ /live, /eval)
    pitch/             HackGT pitch deck HTML
  components/          UI by area (family/, hcp/, home/, onboarding/, settings/)
  lib/
    data.ts            Demo store ↔ Supabase switch
    store.ts, seed.ts  In-memory demo Circles
    auth.ts            Session, profile, clinician checks
    supabase/          Clients + generated types
    ai/                Muse / Grok, Hestia, Familyr Assistant
    clinical/          Analysis, briefs, reports, WhatsApp, audio metrics
    integrations/      Backboard, TigerData, ElevenLabs
  proxy.ts             Session refresh + /family /hcp gating
public/pitch/          Pitch deck static HTML
pitch/SPEAKER.md       55s speaker cue card
supabase/migrations/   Schema and RLS
tigerdata/             Optional hypertable schema
eval/hcp-brief/        Synthetic HCP brief evaluation package
```

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 3000 |
| `npm run build` / `npm start` | Production build and serve |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run eval:hcp` | Generate synthetic cases and score clinician briefs |
| `npm run check:integrations` | Probe Backboard + TigerData with `.env.local` keys |

---

## More docs

- [`DEMO_RUNBOOK.md`](./DEMO_RUNBOOK.md) — 90-second judging path and backup plan  
- [`WINNING_PITCH.md`](./WINNING_PITCH.md) — master pitch language by track  
- [`pitch/SPEAKER.md`](./pitch/SPEAKER.md) — timed cue card for `/pitch`  
- [`HACKATHON_REPORT.md`](./HACKATHON_REPORT.md) — what’s built and what’s still fragile  
- [`eval/hcp-brief/README.md`](./eval/hcp-brief/README.md) — brief eval sources and method  
- [`AGENTS.md`](./AGENTS.md) — notes for coding agents (copy rules included)

## License

MIT. See [`LICENSE`](./LICENSE).
