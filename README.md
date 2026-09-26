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

## Backend and demo mode

- **Demo mode** (default when Supabase keys are missing, or when you toggle **Demo** in the header) keeps the original in-memory mock Alvarez / Okonkwo families from `src/lib/seed.ts`.
- **Live mode** reads and writes the same shapes from the Supabase project. Copy `.env.example` to `.env.local`, then uncheck Demo.

Schema lives in `supabase/migrations/`.
