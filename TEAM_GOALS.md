# Hearth — morning goals mapped to the codebase

Status key: **Done** · **In progress** · **Next** · **Ask Impiricus** · **Pitch only**

---

## Morning goals

| Goal | Status | Notes |
|------|--------|--------|
| AI into recap + auto-schedule family calls + schedule-from-chat | **Next** | Digest is rule/`local-ml` today. Add schedule phrase detection from chat + “Suggested family call” on digest/calendar. |
| Fix previous event syncing into the app | **In progress** | Cookie/refresh unified; pull up to 40 past + 40 future Google events; show Google events on Family view; Connect button on Calendar. Needs `GOOGLE_CLIENT_*` in `.env.local`. |
| Additional UI/UX | **In progress** | Instagram Sans + frosted chat exist. Landing still placeholder — polish next. |
| Demo mode only at the beginning | **Done** | Removed in-app Demo toggle. Landing “Preview the demo family” only; header shows read-only “Sample family” badge. Google sign-in clears demo. |
| Clean out database | **Next** | Truncate live test rows in Supabase (keep seed Alvarez/Okonkwo or re-seed). Confirm before wipe. |

---

## Team goals — healthcare layer

| Goal | Status | Notes |
|------|--------|--------|
| Speech patterns / word count / text times / sleep disruption | **Partial** | `analysis.ts` + `nlp.ts` + `local-ml.ts`: night/morning share, lexical diversity, sentence length, repetition, sentiment vs personal baseline. Surface word-count + sleep card more loudly on HCP. |
| Healthcare DB + dashboard | **Partial** | Clinician `/hcp` reads opted-in members + posts (no separate clinical warehouse). Optional: `clinical_observations` table later. |
| At-risk tags from family | **Next** | New: family-raised concern tags (cognitive / mood / sleep) with consent gate — not diagnosis. |
| Impiricus public API/dashboard | **Ask Impiricus** | No partner SDK in repo today. Ask mentors for sandbox, FHIR export, or embed. Until then: “Impiricus-ready clinician portal” narrative. |

---

## Meta & AI × social good

| Idea | How it hits criteria |
|------|----------------------|
| On-device NLP (no PHI leaving device for scoring) | Privacy-preserving AI for families |
| Opt-in clinician channel | Agency + consent as social good |
| Family check-in from insight | AI → human care, not surveillance |
| Instagram Sans / Meta design literacy | Visual craft; keep story about connection not vanity |
| Weekly story digest | Reduce elder isolation / group-chat fatigue |

---

## Overall / judging prep

| Goal | Status |
|------|--------|
| Presentation scripts per track | **Done** — see `PRESENTATION_SCRIPTS.md` |
| Lock demo cases & workflows | **Done** — see scripts + `DEMO_RUNBOOK.md` (updated) |
| Polish UI/UX | **Next** — landing hero, HCP explainable card hierarchy |

---

## Suggested ownership (today)

1. **Eng A** — Finish Google Calendar live demo with real prior events  
2. **Eng B** — Schedule-from-chat + digest “suggested family call”  
3. **Eng C** — Family at-risk tag (consent-aware) + louder sleep/word metrics on HCP  
4. **Anyone** — Landing polish + rehearse Impiricus / Meta / social-good scripts  
5. **Lead** — Ask Impiricus mentors about API; wipe Supabase test junk before stage  
