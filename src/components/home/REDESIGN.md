# Homepage redesign (for AI / frontend agents)

Keep the product flow; preserve the frosted-glass / Instagram Sans visual language from the family-chat invites lineage.

## Do not break

1. Primary CTA must remain **Continue with Google** (`GoogleSignInButton`). It starts Supabase OAuth (`provider: "google"`) and returns to `/auth/callback` → `/auth/complete`.
2. After Google: users with no family go to `/onboarding` (add members). Users with a family go to `/family`.
3. Keep `data-home` hooks: `header`, `hero`, `sign-in`, `demo`, `footer`.
4. Keep landmarks: skip link `#main-content`, `<header>`, `<main id="main-content">`, `<footer>`.
5. Mobile-first: one column by default; `sm:` and up only for extra layout. Tap targets ≥ 44px. Text ≥ 16px on inputs (iOS zoom).
6. Accessibility: visible focus rings, contrast on cream/paper/ink, `aria-labelledby` on the sign-in region, do not remove `role="alert"` error text.
7. Visual language: Instagram Sans brand lockup, teal ember (`#128c7e`), frosted `.glass` / `.chat-surface` surfaces. Prefer rounded-2xl glass cards over flat red editorial boxes.

## Out of scope for a visual pass

Auth callback, onboarding form fields, RLS, and demo cookie (`hearth-demo`) — change those only if the flow itself is changing.
