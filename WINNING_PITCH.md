# Familyr — HackGT / MLH winning pitch

**One line:** A digital living room for families — with an opt-in clinician channel that turns everyday chat into explainable, baseline-aware care signals.

**Product name on stage:** Familyr (family) · Impiricus-ready portal (`/hcp`)

---

## 60-second master pitch (memorize this)

> Families don’t fall out of care because nobody loves them.  
> They fall out because love lives in a **chaotic group chat** — and the clinician gets **nothing between visits**.
>
> **Familyr** is the porch: async chat, photos, voice-to-text, a calendar that understands English, and a weekly story so grandparents don’t have to scroll.
>
> When someone **opts in**, we look at how *they* write and *when* they post — compared to **their own baseline**, not a population average. Markers like late-night posting and repetition become an **explainable pre-visit note** for the clinician. Turn sharing off, and they disappear from the clinical list.
>
> We’re not diagnosing. We’re closing the loop: **family warmth → consented insight → human check-in.**

---

## Opening hook options (pick one, 8–12s)

1. **Empathy:** “My grandmother left the family group chat. Not because she didn’t care — because it was too loud.”
2. **Clinician:** “Clinicians get a chart. Families get a group chat. Nobody connects the two — until someone opens the door.”
3. **Contrast:** “Most health apps ask elders to download something new. We meet them where they already are: messages.”

---

## Demo choreography (90 seconds)

| Time | Click | Say |
|------|--------|-----|
| 0:00–0:15 | Landing → **Preview the demo family** → Family chat | “This is the porch — not a dashboard.” |
| 0:15–0:30 | Send a short message / show Lucide photo·mic / Easy mode | “Photos, voice-to-text, DMs — built for people who hate apps.” |
| 0:30–0:45 | Calendar or Hestia digest (one only) | “Text becomes time” **or** “Hestia writes the week’s story — not the scroll.” |
| 0:45–1:05 | `/hcp` → **Elena** → expand evidence | “Late-night shift vs *her* baseline. Evidence posts. Decision support — not a diagnosis.” |
| 1:05–1:15 | **Ruth** | “Sparse data → we say insufficient. Honesty is a feature.” |
| 1:15–1:30 | Consent **off** → Elena leaves list | “Privacy isn’t a checkbox theater — the door closes.” |

**Backup if Wi‑Fi dies:** Stay in demo family the whole time. Same story.

**Live wow (if stable):** Two browsers, invite code, post appears on the other laptop → “multiplayer family, real Supabase.”

---

## Problem → insight → product (judge slide language)

| | |
|--|--|
| **Problem** | Group chat burnout + clinical blind spots between visits |
| **Insight** | Signal already exists in *how* and *when* people communicate — if they consent |
| **Product** | Familyr (connection) + opt-in Impiricus-ready clinician view (care) |
| **Moat in 1 demo** | End-to-end loop in 90s: warmth → baseline insight → consent agency → check-in |

---

## Track endings (last 15–20s)

### Impiricus / healthcare
“Familyr is the porch. Impiricus is the house call — only when the family opens the door. Ask: do you have a sandbox API or embed we should target next?”

### Meta / social good
“Familiar social patterns so grandparents actually stay. Muse can write the weekly story and prompts that bridge generations — privacy-preserving signals, with consent.”

### AI / ML
“We score language against *your* baseline with explainable evidence — AI that schedules care and surfaces change without claiming to diagnose.”

### Overall / Grand prize
“Most hackathon health apps are a dashboard. We’re a living room that knows when to call the doctor — and when to stay quiet.”

---

## What makes this *win* (say if asked “why you?”)

1. **Full loop** — consumer UX + clinical decision support in one product  
2. **Consent as product** — opt-out removes the patient from the queue live  
3. **Baseline, not stigma** — personal norms, not “old people score low”  
4. **Honest AI** — Ruth / insufficient data; enrichment never blocks a message  
5. **Shipped** — live Supabase auth, RLS, invites, chat, calendar, HCP, migrations  

---

## Don’t say / do say

| Don’t | Do |
|-------|-----|
| “We diagnose dementia / depression” | “Decision support vs personal baseline” |
| “We scrape all chats for doctors” | “Only opted-in members; family can revoke” |
| “Fully production medical device” | “Hackathon prototype + clear safety rails” |
| Over-explain the stack | One line: “Next.js + Supabase; on-device-style markers + Muse for stories” |
| Apologize for Muse/Grok fallbacks | “Local fallback keeps the demo solid” |

---

## Anticipated judge Q&A (tight answers)

**Q: HIPAA / PHI?**  
A: Opt-in only, RLS, clinician portal never sees non-consented members. Production would need BAA + hardened infra — we designed the consent boundary first.

**Q: Why not just use WhatsApp?**  
A: WhatsApp doesn’t give families a calm weekly story, a shared calendar from natural language, or a consented clinical bridge. We can also ingest ambient WhatsApp for opted-in patients.

**Q: Accuracy of NLP?**  
A: Longitudinal vs self-baseline + human clinician in the loop. We show evidence posts; we don’t auto-alert from one odd message.

**Q: Business model?**  
A: B2B2C — health systems / Impiricus-style channels license the clinician layer; families stay free/freemium on the porch.

**Q: What’s next after HackGT?**  
A: Partner sandbox API, harden notifications (Resend), realtime everywhere, eval set for clinical briefs.

---

## Team roles on stage

| Person | Job |
|--------|-----|
| **Speaker** | Hook → problem → narrate demo → close |
| **Clicker** | Script only; never improvise routes |
| **Backup** | Demo family tab + recorded 90s video ready |

---

## Pre-stage checklist (10 min before)

- [ ] `git rev-parse --short HEAD` matches deployed commit  
- [ ] Landing → Preview demo works offline-ish  
- [ ] Elena evidence expanded once (warm cache)  
- [ ] Ruth + consent toggle rehearsed  
- [ ] Mute Slack/Discord; zoom 100%; hide bookmarks  
- [ ] One sentence Impiricus ask memorized  

---

## Closing line (leave ringing)

> “Stay close without living in the group chat — and let care see what families already know, when they choose to share it.”
