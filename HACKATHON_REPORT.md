# Hearth — What’s Built + How to Win HackGT

**Branch:** `nish/initialization`  
**Pitch line:** A digital living room for families, with an Impiricus clinician channel for members who opt in.

---

## 1. What’s already in the app

### Product surfaces

| Surface | Route | What it does |
|--------|--------|----------------|
| Landing | `/` | Google sign-in + “Preview the demo family” |
| Onboarding | `/onboarding` | Create a circle or join with invite code; full address + autofill |
| Family chat | `/family` | Group + DMs, photos, voice-to-text, **+ Add member** invites |
| Calendar | `/family/calendar` | Natural-language event create (“Sofia Saturday 10am at Piedmont”) |
| Weekly story | `/family/digest` | Template digest + listen (TTS) + refresh |
| Clinician portal | `/hcp`, `/hcp/patients/[id]` | Opt-in patients only; explainable insights + pre-visit note |
| Invite accept | `/invite/[token]` | Accept link → join family → chat |

### Core capabilities (working)

- **Demo mode** — Alvarez / Okonkwo seed families, no Google required; toggle in header  
- **Live mode** — Supabase Auth (Google), Postgres, RLS, profiles ↔ members  
- **Family chat** — WhatsApp-style UI (frosted glass), 4s refresh, Easy mode  
- **Invites** — join codes *and* email/token links from chat  
- **Consent** — clinician sharing toggle; HCP never sees non-opted-in members  
- **Clinical NLP (on-device)** — lexical diversity, sentence length, repetition, sentiment, posting-hour shifts vs **personal baseline**  
- **Explainable HCP story** — Elena late-night / repetition narrative + Ruth “insufficient data” contrast  
- **Address onboarding** — street/apt/ZIP, Nominatim typeahead + geolocation  
- **Design system** — Instagram Sans brand, ember/clinic tokens, a11y skip-link / focus / 44px targets  

### Stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · Supabase (Auth + Postgres + RLS) · Nominatim · `googleapis` (partial)

### Demo-ready pitch path (≈90s)

1. Landing → Preview demo  
2. Family chat (post / photo / voice)  
3. Calendar NL event  
4. Weekly digest + listen  
5. HCP → Elena explainable insight → Ruth insufficient data  
6. Toggle clinician sharing off → patient disappears  

---

## 2. What’s unfinished / fragile (don’t oversell)

| Area | Gap |
|------|-----|
| Landing visuals | Still a functional placeholder (`REDESIGN.md`) |
| Google Calendar | Dual OAuth paths; calendar **page** doesn’t show merged Google events; env vars incomplete in `.env.example` |
| HCP → chat check-in | Draft URL built; chat doesn’t consume `?draft=` |
| Voice | SpeechRecognition → text, not real audio files |
| Photos | Data URLs in DB (fine for demo, not production) |
| Chat sync | Polling, not Supabase Realtime |
| Analysis clock | Still anchored to HackGT demo date in places |
| Apple Calendar | Not started |
| Impiricus | Branding + clinician UX only — **no partner API** |
| Tests | None |

---

## 3. Improvements to make it hackathon-win worthy

Prioritized for **judge impact in a short demo**, not for production polish.

### P0 — Do these first (biggest wow / closes holes)

1. **Close the care loop: HCP → family chat**  
   Prefill composer from `?draft=` (“Elena, I’m thinking of you — how was your sleep?”). Judges love *actionable* clinical insight → family support.

2. **Make Google Calendar actually demo**  
   One connect button on Calendar; show 🟢 Google events next to Hearth events; write one event back. Kill the dual-OAuth confusion. Document `GOOGLE_CLIENT_*` in `.env.example`.

3. **Landing that looks like a winner**  
   Full-bleed warm family/porch hero, Instagram Sans brand hero, one headline, one CTA. Current page works; it doesn’t *feel* finished.

4. **90-second “judge script” UI affordances**  
   Sticky “Demo path” chips or a one-click “Jump to Elena’s clinician view” from demo landing so you never fumble routes on stage.

5. **Realtime chat (or fake it better)**  
   Supabase Realtime on `posts` *or* optimistic UI + “Seen by family” toast. Polling feels unfinished when two laptops are on stage.

### P1 — Differentiation vs other HackGT health apps

6. **One killer explainable card**  
   On HCP patient page: big “What changed” + 3 evidence quotes + “What to ask in visit” — already partially there; make it *unmissable* (typography, animation, print-to-PDF).

7. **Family digest as a product moment**  
   “Share this week’s story” → generate a beautiful card image / copy-link for group chat. Turns digest from page → *shareable artifact*.

8. **Consent theater done right**  
   Animated “Elena left the clinician circle” when sharing toggles off — makes privacy the hero, not a checkbox.

9. **Voice that feels magical for elders**  
   Big Talk button, waveform, auto-send, Easy mode default for Elena. Accessibility is a judging axis Impiricus will notice.

10. **Invite that feels social**  
    After + Add member: native share sheet + QR of invite link. Shows multi-user family in 10 seconds.

### P2 — Stretch if time remains

11. Apple Calendar / ICS export (parity claim without full Apple API)  
12. Supabase Storage for photos  
13. Push / email digests (even a Resend “Weekly Hearth” mock)  
14. Light eval set: 5 golden posts → assert Elena flags fire (credibility for clinical track)  
15. Dark / clinic high-contrast theme for `/hcp` only  

---

## 4. Suggested “win narrative” for judges

**Problem:** Families live in chaotic group chats; clinicians get nothing between visits.  
**Insight:** The signal is already in how people write and when they post — if they opt in.  
**Product:** Hearth keeps the family warm; Impiricus sees only consented members, vs *their own baseline*, with explainable evidence — then nudges the family with a check-in.  
**Why us:** End-to-end loop (family → insight → action) in one demo, not a dashboard alone.

**One line:**  
> “Hearth is the porch. Impiricus is the house call — only when the family opens the door.”

---

## 5. Recommended next 4–6 hours of work

| Hour | Ship |
|------|------|
| 0–1 | `?draft=` into ChatApp composer + HCP CTA polish |
| 1–2 | Calendar page calls `/api/events` + Google badge; one Connect button |
| 2–3 | Landing hero redesign (brand-first, full-bleed) |
| 3–4 | Consent toggle animation + digest “Copy story” |
| 4–5 | Rehearse DEMO_RUNBOOK on two browsers; fix anything that flakes |
| 5–6 | Buffer / Realtime or shareable digest card |

---

## 6. Do *not* spend time on (before judging)

- Full production RLS audit  
- Apple Calendar sync  
- Replacing the NLP with a real LLM API (risk + latency; on-device is a *feature* for privacy)  
- Refactoring seed data unless a demo beat is broken  

---

*Generated from the current `nish/initialization` codebase for HackGT 13 prep.*
