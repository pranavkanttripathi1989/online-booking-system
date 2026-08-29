---
id: PLAN215
type: bug
feature: frontend-platform
created: 2026-08-29
updated: 2026-08-29
status: done
parent: BUG048
related: [TP235, TR235]
---

# PLAN215 — guard the clinician encounter/prescription routes

## Approach

1. Traced the real click-path live in the code (not from documentation)
   via an `Explore` agent: `appointments/detail.jsx` → `EncounterWorkspace.jsx`
   → `PrescriptionBuilder.jsx`, confirming every navigate call and its
   parameter shape matches what the receiving page reads.
2. Confirmed the backend's authoritative gate: `getOrCreateEncounter`
   and `createPrescription` are both `@Auth('clinician', ...)`/
   `@Auth('clinician')` respectively (grepped the real resolvers, not
   assumed).
3. Wrapped both `/clinician/encounters/:appointmentId` and
   `/clinician/prescriptions/new` in a single `<Route element={
   <RoleGuard roles={['clinician']} />}>` block in `App.jsx`, with an
   inline comment recording why (matching this file's own established
   convention for documenting a guard-gap fix, e.g. the Staff-routes
   comment immediately below it).

## Testing

- `npx eslint src/App.jsx` — clean.
- `npm run build` — succeeds.
- Full `npx jest` — green; `EncounterWorkspace.test.jsx`/
  `PrescriptionBuilder.test.jsx` render their own `<Route>` directly
  (not through `App.jsx`), so are structurally unaffected by the added
  guard and remain the right place to test each page's own behaviour.
- Live e2e re-run not performed this pass (no browser-automation tool
  invoked for this specific check) — the 3 specs that hit these routes
  all authenticate as a real clinician first, so are expected to pass
  unaffected; logged as the next verification step, not hidden.

## Commit

One commit, `App.jsx` only.
