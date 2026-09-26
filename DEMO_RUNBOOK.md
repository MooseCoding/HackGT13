# Hearth demo runbook

## Before judges arrive

1. Apply every Supabase migration, including `20260926040000_family_membership_consent.sql`.
2. Deploy the branch and confirm `/api/health/supabase` succeeds in live mode.
3. Open two separate browser profiles and sign in with two Google accounts.
4. In profile A, create a family with both people. Copy the invite code from the family header.
5. In profile B, choose **Join a circle**, enter the code, and claim the exact member name created in step 4.
6. Send a harmless test post from profile A. Confirm it appears in profile B within four seconds and remains after refresh. Delete test-only data in Supabase before judging if desired.
7. Return both profiles to the family chat. Keep the demo-mode Alvarez family ready in a third tab as an offline fallback.

## 90-second live path

1. **0:00–0:20 — Real family feed.** Post from browser profile A. Point to the same post appearing in profile B, then refresh profile B to show persistence and family isolation.
2. **0:20–0:45 — Explainable signal.** Open **Clinician → Elena Alvarez**. Read the late-night percentage change, show both date ranges, and expand the visible source posts. Say: “This describes activity; it does not diagnose from word choice.”
3. **0:45–1:00 — Insufficient data.** Open **Ruth Okonkwo** in demo mode and show the explicit minimum-data state.
4. **1:00–1:15 — Consent.** In the family header, turn **Clinician sharing** off. Refresh the clinician list to show Elena disappear. Turn it back on and show her return.
5. **1:15–1:30 — Close the loop.** Reopen Elena and click **Check in with Elena**. Show the suggested shared-calendar moment and the prefilled message.

## Backup recording shot list

Record the same five beats above at 1440×900, with browser zoom at 100%. Keep it under 90 seconds, hide bookmarks and notifications, and export both MP4 and WebM. Start and end on the family chat so a failed live demo can transition cleanly.

## Final click check

- Google sign-in and callback
- Create and join flows
- Post, automatic refresh, and hard refresh persistence
- Calendar creation
- Consent off/on and clinician list change
- Elena insight evidence and check-in link
- Ruth insufficient-data state
- Demo/live toggle and sign-out
