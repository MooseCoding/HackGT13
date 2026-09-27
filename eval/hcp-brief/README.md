# Hearth Weekly HCP Brief — evaluation package

This folder is a **team-authored data and evaluation package**, not Impiricus vendor content.

## What Impiricus asked for → what we store

| Request | Artifact |
|---|---|
| Report format | `report.schema.json` + `rules.json` (`Hearth Weekly HCP Brief`) |
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
node eval/hcp-brief/generate-cases.mjs
npx vitest run eval/hcp-brief/hcp-brief.eval.test.ts
```

`pipeline-results.json` is written by the test from the live `analyzeMember` pipeline.
