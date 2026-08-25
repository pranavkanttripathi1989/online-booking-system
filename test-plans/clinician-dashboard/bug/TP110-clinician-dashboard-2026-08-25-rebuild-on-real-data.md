---
id: TP110
type: bug
feature: clinician-dashboard
created: 2026-08-25
updated: 2026-08-25
status: approved
parent: PLAN083
related: [BUG021]
---

# TP110 — Test plan for the clinician dashboard rebuild

## Backend — `backend/src/blocks/blocks.service.spec.ts` / `blocks.resolver.spec.ts`

| # | Case | Expected |
|---|---|---|
| 1 | `'clinician'` caller calls `createSpacerBlock` with `input.clinician_id` equal to their own JWT `clinician_id` | `success: true`, row created |
| 2 | `'clinician'` caller calls `createSpacerBlock` with `input.clinician_id` set to a **different** clinician's id | `success: false`, `userErrors` populated, **no row created** — this is the actual security case the fix exists for |
| 3 | Existing `'manager'`/`'admin'`/`'super_admin'` create-path tests | unchanged, still green — this fix must not alter behavior for the roles that already worked |
| 4 | `'clinician'` caller calls `createSpacerBlock` with a `clinic_id` belonging to a different org | rejected by the pre-existing `assertClinicInOrg` check, unchanged behavior |

## Frontend unit — `frontend/src/pages/clinician/Dashboard.test.jsx` (new file)

| # | Case | Expected |
|---|---|---|
| 1 | `GetMyClinicianProfile` + `GetTodayAppointments` both resolve with real data | Real patient name(s) render; the literal mock names (`Emma Wilson`, `Lily Chen`, `James Brown`, `Amir Patel`, `Kenji Yamada`) never appear; no "Offline — showing demo data" text anywhere in the DOM |
| 2 | `GetMyClinicianProfile` resolves with `me.clinician: null` | A real "not linked to a clinician profile" message renders; no appointment timeline, no mock data |
| 3 | `GetTodayAppointments` resolves with a GraphQL error | A real error `Alert` renders with a "Retry" action; clicking it calls `refetch` |
| 4 | `GetTodayAppointments` resolves with `data: { appointments: { data: [] } }` (a genuine empty day) | "No more appointments today" / equivalent empty state renders — **not** mock data (this is the direct regression test for defect #2: an empty real result must never be indistinguishable from an unauthenticated/error state) |
| 5 | An appointment with `status: 'confirmed'` is returned | It counts toward "Remaining"/appears in the queue/next-appt panel — regression test for the `scheduled`-only filter bug fixed alongside this |

## e2e — `frontend/e2e/clinician-dashboard.spec.js` (new file)

Against the real backend, logged in as the existing linked dev-seed
clinician fixture (`Sarah Mitchell`).

| # | Scenario | Assertion |
|---|---|---|
| 1 | Load `/clinician/dashboard` | No "Offline" banner; the dashboard shows this clinician's own real name/clinic, not "Dr. —" and not a mock name |
| 2 | Open "Add Block", fill start/end time + reason, save | Dialog closes on a real success (not instantly-optimistic); after a manual page reload, the block is still present (proves it was persisted via `createSpacerBlock`, not merged into local-only state) |
| 3 | Click a real `scheduled`/`confirmed` appointment → "Mark Complete" | Its status updates in the UI; after a page reload, it is still `completed` (proves `completeAppointment` actually ran, not a local override) |
| 4 | (Negative, backend-only, exercised via the unit tests above rather than a second e2e login) A clinician cannot create a block attributed to another clinician's id | Covered by backend case #2 — not re-asserted at the e2e layer, no UI surface exists to attempt it from |

## Full-suite gate before commit (Hard Rule 3)

```
cd backend  && npm test && npm run test:int && npx eslint "{src,apps,libs,test}/**/*.ts" && npx tsc --noEmit
cd frontend && npm run lint && npm test && npm run build
npx playwright test clinician-dashboard.spec.js   # new spec, plus a full or targeted re-run of previously-green specs touching clinician role
```
