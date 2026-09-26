# Homepage redesign (for AI / frontend agents)

This landing page is a **placeholder**. Keep the product flow; replace the visual design.

## Do not break

1. Primary CTA must remain **Continue with Google** (`GoogleSignInButton`). It starts Supabase OAuth (`provider: "google"`) and returns to `/auth/callback`.
2. After Google: users with no family go to `/onboarding` (add members). Users with a family go to `/family`.
3. Keep `data-home` hooks: `header`, `hero`, `sign-in`, `demo`, `footer`.
4. Keep landmarks: skip link `#main-content`, `<header>`, `<main id="main-content">`, `<footer>`.
5. Mobile-first: one column by default; `sm:` and up only for extra layout. Tap targets ≥ 44px. Text ≥ 16px on inputs (iOS zoom).
6. Accessibility: visible focus rings, contrast on cream/paper/ink, `aria-labelledby` on the sign-in region, do not remove `role="alert"` error text.
7. Fonts: **Fraunces** (`font-serif`) for the headline, **Nunito** (`font-sans`) for UI. Tokens live in `src/app/globals.css` (`--ember`, `--ink`, `--mute`, `--cream`, `--paper`, `--line`).

## Suggested redesign (feel free)

- Illustration or photo of a family porch / kitchen table (warm, not clinical).
- Short proof line (“async chat · calendar · weekly story”).
- Optional secondary path: clinician (`/hcp`) after sign-in only.
- Motion: respect `prefers-reduced-motion`.
- Dark mode is optional; if added, keep ember/clinic tokens.

## Out of scope for a visual pass

Auth callback, onboarding form fields, RLS, and demo cookie (`hearth-demo`) — change those only if the flow itself is changing.
