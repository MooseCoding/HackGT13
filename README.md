# Hearth

HackGT 13 — a digital living room for families, with an Impiricus clinician channel for opted-in members.

## What it is

**Hearth** is the consumer “porch”: async family chat, photos, voice notes, a natural-language calendar, and a weekly story digest so nobody has to live in the group thread.

**Impiricus portal** (`/hcp`) is the clinician view. It never sees family members who did not opt in. Markers (lexical diversity, sentence length, repetition, sentiment, posting hours) are compared to **that person’s own baseline**, then turned into a structured pre-visit note. This is decision support, not a diagnosis, and not a medical device.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- Family app: `/family` — switch who you’re posting as; turn on **Easy** for large targets and read-aloud.
- Calendar: `/family/calendar` — type a sentence like `Sofia has her soccer tournament this Saturday at 10 AM at Piedmont Park`.
- Weekly story: `/family/digest` — local template from this week’s posts; listen with the browser voice.
- Clinician panel: `/hcp` — compare Elena Alvarez (flags) with Ruth Okonkwo (stable).

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · on-device NLP for Phase 2 metrics.
