# Familyr Weekly HCP Brief — evaluation package

This folder is a **team-authored data and evaluation package**, not Impiricus vendor content.

## Sources

Background references (full detail in [`sources.json`](./sources.json)):

1. **NIA — Talking With Your Older Patients**  
   https://www.nia.nih.gov/health/health-care-professionals-information/talking-your-older-patients  
   Informs plain-language, respectful, one-screen clinician copy and caregiver contact actions.

2. **TalkBank DementiaBank access index**  
   https://talkbank.org/dementia/access/  
   Methodological inspiration for longitudinal language baselines. **We do not download or redistribute DementiaBank data**; `cases.json` is fully synthetic.

Neither organization endorses Familyr. Briefs are decision support only.

## What Impiricus asked for → what we store

| Request | Artifact |
|---|---|
| Report format | `report.schema.json` + `rules.json` (`Familyr Weekly HCP Brief`) |
| 5–20 excellent reports | `excellent-reports.json` (10 synthetic examples) |
| 10 timelines | `cases.json` (`P01`–`P10`) |
| Clinician labels | `expected_label` + `label_reason` (team expected review labels) |
| 5 stable / 5 concerning | `P01`–`P05` stable, `P06`–`P10` `review_suggested` |
| Allowed recommendations | `rules.json` → `allowed_recommendations` |
| Forbidden claims | `rules.json` → `forbidden_claims` |

## Case shape

Each case includes: `patient_id`, `baseline_window`, `current_window`, `messages`, `expected_label`, `label_reason`, `expected_evidence_ids`, `benign_explanation`.

## Report shape

Each brief includes: `headline`, `status`, `changes`, `evidence_ids`, `limitations`, `suggested_clinician_actions`.

## Regenerate + run pipeline

```bash
npm run eval:hcp
```

`pipeline-results.json` is written by the test from the live `analyzeMember` pipeline.

## Golden story (demo / judges)

Clinician UI surfaces three representative cases at `/hcp/eval` (P03 stable, P06 + P09 review-suggested). The deterministic sustained-shift path lives at `/hcp/live` (“Simulate sustained shift”).
