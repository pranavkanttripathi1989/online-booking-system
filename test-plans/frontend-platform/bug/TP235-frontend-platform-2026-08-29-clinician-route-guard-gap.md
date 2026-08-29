---
id: TP235
type: bug
feature: frontend-platform
created: 2026-08-29
updated: 2026-08-29
status: approved
parent: PLAN215
related: [TR235]
---

# TP235 — guard the clinician encounter/prescription routes

## Cases

1. **Both routes now sit inside a RoleGuard.** `App.jsx`'s route tree
   shows `/clinician/encounters/:appointmentId` and `/clinician/
   prescriptions/new` wrapped in `<RoleGuard roles={['clinician']}>`.
2. **Existing page-level unit tests unaffected.**
   `EncounterWorkspace.test.jsx` and `PrescriptionBuilder.test.jsx`
   still pass unmodified — both render their target page inside a
   locally-declared `<Route>` (not `App.jsx`'s tree), so the new guard
   doesn't change what they exercise.
3. **Build/lint clean.** `npx eslint src/App.jsx` — 0 errors. `npm run
   build` — succeeds.
4. **Real click-path still resolves correctly for a clinician.** The
   navigate calls traced in `BUG048`'s own account (appointment detail
   → `navigate('/clinician/encounters/:id')` → EncounterWorkspace →
   `navigate('/clinician/prescriptions/new?encounterId=...&patientId=
   ...')` → PrescriptionBuilder) are unaffected by adding a guard that
   a real clinician session always passes.

## Out of scope for this test plan

A live e2e re-run of the 3 specs that navigate to these routes
(`prescription-builder.spec.js`, `encounter-workspace.spec.js`,
`gap-analysis-a4-a9.spec.js`) — not executed this pass (no browser-
automation tool invoked for this specific check). All three
authenticate as a real clinician before navigating, so are expected to
pass unaffected; logged as the next verification step, not hidden.
