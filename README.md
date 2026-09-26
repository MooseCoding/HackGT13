# Hearth

HackGT 13 — a digital living room for families, with an Impiricus clinician channel for opted-in members.

## What it is

**Hearth** is the consumer “porch”: async family chat, photos, voice notes, a natural-language calendar, and a weekly story digest so nobody has to live in the group thread.

**Impiricus portal** (`/hcp`) is the clinician view. It never sees family members who did not opt in. Markers (lexical diversity, sentence length, repetition, sentiment, posting hours) are compared to **that person’s own baseline**, then turned into a structured pre-visit note. This is decision support, not a diagnosis, and not a medical device.

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

1. **Homepage** — Continue with Google (or preview the demo family).
2. **Onboarding** — name the circle and add family members.
3. **App** — chats, calendar, weekly story, clinician view.

### Google sign-in

In the [Supabase dashboard](https://supabase.com/dashboard) → Authentication → Providers → Google, add a Google Cloud OAuth client. Redirect URLs:

- `https://nkksroiojqcwwbptplmo.supabase.co/auth/v1/callback`
- `http://localhost:3000/auth/callback`

Site URL: `http://localhost:3000`.

- Family app: `/family`
- Calendar: `/family/calendar`
- Weekly story: `/family/digest`
- Clinician panel: `/hcp`

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres) · on-device NLP for Phase 2 metrics.

## Phase 2 clinical engine

- The collector derives interaction metadata from opted-in members only: lexical diversity, sentence length, repetition, sentiment range, engagement cadence, response latency, and time-of-day shifts.
- The triage engine compares the latest 14 days with that member's prior 30-day baseline and emits explainable cognitive-communication, social-engagement, and affect signals.
- `/hcp` is the Impiricus review queue; `/hcp/patients/[id]` shows the generated pre-visit brief, trend evidence, confidence, and suggested next step.
- Analysis runs, snapshots, and deduplicated alerts are persisted in Supabase. Clinicians can move alerts through `new`, `reviewing`, `contacted`, and `dismissed` states.
- `/api/clinical/analyze` is the protected autonomous worker endpoint. `vercel.json` schedules it daily at 12:00 UTC; set `CRON_SECRET` and the server-only `SUPABASE_SERVICE_ROLE_KEY` in deployed environments.
- Live clinician access requires either `profiles.account_role = 'clinician'` (or `admin`) or an email listed in `HCP_CLINICIAN_EMAILS`. Never expose the service-role key through a `NEXT_PUBLIC_*` variable.
- A single concerning family message can prompt a gentle check-in, but does not create a clinical alert; longitudinal baseline shifts drive the review queue.

The output is clinical decision support, not a diagnosis or treatment recommendation. Changes can reflect language, device access, travel, illness, or family communication patterns and require clinician confirmation.

### Ambient WhatsApp and voice intake

Hearth is designed as a signal layer for communication families already use, not as a replacement messenger.

- Configure Meta's WhatsApp Business webhook callback as `/api/webhooks/whatsapp` and copy the `WHATSAPP_*` values from `.env.example`.
- Incoming opted-in text messages and voice notes are normalized into the existing longitudinal timeline.
- Voice notes are transcribed with Groq Whisper and reduced to speech pace, pause share, average pause, and hesitation markers. Original media is not stored by Hearth.
- Sender-to-patient mapping is explicit through `WHATSAPP_PATIENT_MAP`; unrecognized or non-consented senders are ignored.
- `/hcp/live` provides a deterministic judge demo of the complete flow when external credentials or venue Wi-Fi are unavailable.

For a real Meta test-number setup, expose the local app through an HTTPS tunnel, register the callback URL and verify token in Meta's developer dashboard, subscribe the app to WhatsApp message webhooks, and map the sender's E.164 phone number to an opted-in demo patient.

## Backend and demo mode

- **Demo mode** (default when Supabase keys are missing, or when you toggle **Demo** in the header) keeps the original in-memory mock Alvarez / Okonkwo families from `src/lib/seed.ts`.
- **Live mode** reads and writes the same shapes from the Supabase project. Copy `.env.example` to `.env.local`, then uncheck Demo.

Schema lives in `supabase/migrations/`.

Live families now support multiple authenticated accounts through a short invite code. Each account claims one pre-created member profile, and the server verifies that identity for posts, calendar events, and clinician-sharing consent. Family chat refreshes every four seconds so posts appear across devices and remain in Supabase after reload.

For the two-profile rehearsal, consent demo, explainable-insight path, and backup recording shot list, see [`DEMO_RUNBOOK.md`](./DEMO_RUNBOOK.md).
