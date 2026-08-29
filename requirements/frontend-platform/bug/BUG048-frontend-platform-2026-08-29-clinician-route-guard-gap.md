---
id: BUG048
type: bug
feature: frontend-platform
created: 2026-08-29
updated: 2026-08-29
status: done
parent: null
related: [PLAN215, TP235, TR235]
---

# BUG048 — `/clinician/encounters/:id` and `/clinician/prescriptions/new` had no route-level RoleGuard

## How it was found

The user asked directly: "have you checked all frontend if clinician
start consultation how he can start or write prescription" — a live
QA question about the clinician's start-consultation-to-prescription
path. A dedicated trace (`Explore` agent) confirmed the click-path
itself is real and correctly wired end-to-end:

1. `pages/appointments/detail.jsx` — clinician clicks "Start
   Consultation" → `navigate(\`/clinician/encounters/${apt.id}\`)`.
2. `pages/clinician/EncounterWorkspace.jsx` — calls the real
   `getOrCreateEncounter` mutation, loads the encounter.
3. Its "New Prescription" button → `navigate(\`/clinician/
   prescriptions/new?encounterId=${encounter.id}&patientId=
   ${encounter.patient_id}\`)`.
4. `pages/clinician/PrescriptionBuilder.jsx` reads exactly those two
   query params and wires them into `createPrescription`.

No broken link, no wrong parameter shape. But tracing the route
registration in `App.jsx` surfaced a real gap: **neither route sat
inside a `<RoleGuard>`** — both were registered directly under the
generic `ProtectedRoute`/`AppShell` wrapper with no role restriction at
all, unlike every other clinician-only route in the file.

## Impact

- `EncounterWorkspace.jsx` has its own internal `hasRole('clinician')`
  check (renders an `<Alert>` and stops for anyone else), so it
  degraded safely — no real gap there, just a missing defense-in-depth
  layer inconsistent with the rest of the app's convention.
- `PrescriptionBuilder.jsx` has **no internal role check at all** — a
  logged-in patient, staff, receptionist, manager, or admin could
  navigate directly to `/clinician/prescriptions/new?encounterId=
  ...&patientId=...` and interact with the full prescription form,
  only to have the final `createPrescription` submission rejected by
  the backend (`@Auth('clinician')`, confirmed in
  `backend/src/prescriptions/prescriptions.resolver.ts`).
- **Not a data-leak / IDOR** — the backend gate is correct and
  authoritative (`SEC-18`: "frontend permission checks are UX, never
  security... every gate MUST also be enforced server-side"). This is
  the same bug *class* this codebase has hit repeatedly (`BUG039`,
  the webhooks/api-keys finding in Phase G+2, the pharmacy nav/route
  gap) — a frontend route gate not matching its backend resolver's
  `@Auth()` — here manifesting as a gate that's entirely *absent*
  rather than too narrow.

## Fix

Wrapped both routes in a new `<Route element={<RoleGuard
roles={['clinician']} />}>` block in `App.jsx`, matching the
`roles={['clinician']}` scope both the frontend's own internal check
(`EncounterWorkspace`) and the backend's `@Auth('clinician')` gate
(`getOrCreateEncounter`, `createPrescription`) already agree on — no
other role can ever successfully create a prescription server-side, so
no broader role list is warranted.

## Verification

- `npx eslint src/App.jsx` — clean.
- `npm run build` — succeeds, no route regression.
- Full frontend `npx jest` — green (see `TR235`); the existing
  `EncounterWorkspace.test.jsx`/`PrescriptionBuilder.test.jsx` render
  their `<Route>` directly (not through `App.jsx`'s tree) so are
  unaffected by the added guard, and remain the correct place to test
  each page's own internal behaviour.
- The 3 e2e specs that navigate to `/clinician/encounters/:id`
  (`prescription-builder.spec.js`, `encounter-workspace.spec.js`,
  `gap-analysis-a4-a9.spec.js`) all authenticate as a real clinician
  account first, so they pass through the new guard unaffected — not
  re-run live this pass (no browser-automation tool invoked for this
  specific check), logged as the natural next verification step, not
  hidden.
