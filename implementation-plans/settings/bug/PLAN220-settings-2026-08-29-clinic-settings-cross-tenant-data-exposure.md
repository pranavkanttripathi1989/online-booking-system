---
id: PLAN220
type: bug
feature: settings
created: 2026-08-29
updated: 2026-08-29
status: done
parent: BUG052
related: [TP240, TR240]
---

# PLAN220 — Clinic Settings cross-tenant data exposure

## Approach

1. Investigated via a dedicated Explore pass before any edit — traced
   both `GET_CLINICS_FOR_SETTINGS` (frontend) → `clinics()` →
   `ClinicsService.findAll()` → `orgScope()` (backend, deliberately
   unscoped for platform operators) and `GET_ORG_BRANDING` →
   `myOrgBranding()` (strictly `client_org_id`-gated, no carve-out) to
   confirm this was a real bug, not an intentional design difference —
   checked `seed.ts` to confirm the demo admin account's real
   `client_org_id: null` and that "MG Road Clinic" genuinely belongs to
   a different tenant than the admin.
2. Fixed entirely on the frontend: `loadClinic()` now short-circuits
   (same as the existing `!canManageClinic` guard) when
   `!hasOrgForBranding` — reusing Branding's own already-correct
   org-membership signal as the single source of truth, rather than
   inventing a second check or trusting a `user.client_org_id` field
   that isn't even exposed to the frontend today (confirmed via grep).
3. Resequenced the `loadClinic()` `useEffect` to run only after
   `brandingLoaded`, avoiding a race where `hasOrgForBranding`'s own
   initial `false` default could be misread as "confirmed no org"
   before the real query resolves.
4. Split the empty-state message into two cases: genuinely no
   organisation (new) vs. a real org with no clinics yet (unchanged
   wording).
5. Deliberately did not touch `ClinicsService.findAll()`/`orgScope()`
   — correct, intentional backend behavior for legitimate platform-wide
   tooling; the bug was this one form's reuse of it.

## Testing

- `npx eslint` — clean.
- Two new regression tests in `settings/index.test.jsx`: an org-less
  admin sees the "no organisation" message with **no**
  `GET_CLINICS_FOR_SETTINGS` mock provided (so MockedProvider would
  fail loudly if the fix regressed and the query fired anyway); a
  genuinely org-scoped caller still loads and displays their real
  clinic.
- Full `settings/index.test.jsx` suite: 12/12.
- Live Chrome DevTools MCP verification against the real dev stack,
  both the org-less-admin case and the legitimate-manager case (see
  `TR240`).

## Commit

Code and docs together in one pair (small, single-file fix) —
`frontend/src/pages/settings/index.jsx` + `.test.jsx`.
