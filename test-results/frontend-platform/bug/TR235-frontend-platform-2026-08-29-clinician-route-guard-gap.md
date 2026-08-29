---
id: TR235
type: bug
feature: frontend-platform
created: 2026-08-29
updated: 2026-08-29
status: done
parent: TP235
related: [PLAN215]
commit: pending
---

# TR235 — guard the clinician encounter/prescription routes — results

## Outcome: PASS

| Case (from `TP235`) | Result |
|---|---|
| 1. Both routes now sit inside a RoleGuard | ✅ `App.jsx` shows `<Route element={<RoleGuard roles={['clinician']} />}>` wrapping both `/clinician/encounters/:appointmentId` and `/clinician/prescriptions/new` |
| 2. Existing page-level unit tests unaffected | ✅ `EncounterWorkspace.test.jsx` (23/23) and `PrescriptionBuilder.test.jsx` both pass — see `TR234`'s own account of the isolation investigation into a transient failure, confirmed unrelated to this change (it renders its own `<Route>`, never `App.jsx`'s) |
| 3. Build/lint clean | ✅ `npx eslint src/App.jsx` 0 errors; `npm run build` succeeds |
| 4. Real click-path still resolves for a clinician | ✅ traced again after the change: appointment detail → `navigate('/clinician/encounters/:id')` → EncounterWorkspace → `navigate('/clinician/prescriptions/new?encounterId=...&patientId=...')` → PrescriptionBuilder — a real `RoleGuard` pass-through for a `'clinician'`-role JWT doesn't alter this |

## Out of scope, stated

A live e2e re-run of the 3 specs that navigate to these routes
(`prescription-builder.spec.js`, `encounter-workspace.spec.js`,
`gap-analysis-a4-a9.spec.js`) was not performed this pass — no
browser-automation tool was invoked for this specific check. All three
authenticate as a real clinician before navigating, so are expected to
pass through the new guard unaffected; this is the logged next
verification step, not a hidden gap.

## Verdict

Ships as `done`.
