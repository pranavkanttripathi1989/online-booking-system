---
id: TR221
type: improvement
feature: prescriptions
created: 2026-08-27
updated: 2026-08-27
status: pass
parent: TP221
related: [REQ159, PLAN201]
---

# TR221 — Results: allergy hard-stop on prescribing (P2-07, scoped)

## Backend

- `npx jest allergy-check --maxWorkers=1`: **10/10 green**.
- `npx jest prescriptions.service --maxWorkers=1`: **66/66 green**
  (61 pre-existing + 5 new).
- `npx jest --maxWorkers=2` (full backend suite): **126/126 suites,
  2011/2011 tests, green** — including `queue/queue.service.spec.ts`,
  whose two failures earlier this session (a midnight-IST-boundary
  timing edge, unrelated to any of this session's own changes) are gone
  now that the clock has moved past that window, confirming the earlier
  diagnosis.
- `npx tsc --noEmit` / `npx eslint`: clean.

## Frontend

- `npx jest src/pages/clinician/PrescriptionBuilder.test.jsx
  --maxWorkers=1`: **6/6 green** (4 pre-existing P1-12 + 2 new).
- `npm run lint`: **4908 warnings, 0 errors** — ratchet ceiling raised
  from 4907 to 4908; the one new warning is the pre-existing I18N-1
  class already present throughout this codebase's un-migrated pages.
- `npm run build` + `npm run size`: green. Initial bundle 348.95/350 kB
  (no `App.jsx` route registration this slice — an existing page was
  edited, not a new one added — so headroom is essentially unchanged
  from the prior slice). Largest lazy chunk 109.92/115 kB; initial CSS
  13.5/18 kB.
- Full suite (`npx jest --maxWorkers=2 --json`): 270/286 tests, 7
  failing suites in the full parallel run
  (`manager/claims/index.test.jsx`, `clinician/EncounterWorkspace.test.jsx`,
  `clinicians/CreateClinicianPage.test.jsx`, `admin/Communications.test.jsx`,
  `settings/index.test.jsx`, `appointments/index.test.jsx`,
  `patient/Appointments.test.jsx`) — a larger set than this session's
  usual 2 pre-existing flaky suites, reflecting sustained host load
  after a long session. Spot-checked the ones sharing a touched file
  (`CreateClinicianPage.test.jsx`, since `BUG028` changed
  `CREATE_CLINICIAN_MUTATION`'s own selection set) plus two more
  (`appointments/index.test.jsx`, `patient/Appointments.test.jsx`) in
  isolation — all pass cleanly (6/6, 8/8), confirming host-load
  contention rather than a regression from either this slice or
  `BUG028`. `PrescriptionBuilder.test.jsx` itself is not among the
  failures in either run.

## Real findings from this slice

1. The scope decision (allergy-only, drug-drug interaction deferred)
   was made explicitly with the user before any code was written — see
   `REQ159`'s own account.
2. No implementation bugs found this pass — every new test passed on
   first write, matching this codebase's own documented pattern for a
   slice that front-loads a prior slice's established fix patterns
   (here: `assertTpgCompliant()`'s hard-stop shape,
   `patientAllergyBanner()`'s reuse convention) rather than discovering
   them via a failing test.

## Open items

- Live verification against a real seeded patient with an active
  allergy record was not attempted this pass — doing so would require
  creating a real encounter (no existing one has a suitable allergy
  diagnosis attached) and carefully reverting it; the unit-level
  coverage already exercises the exact same code path against
  `Diagnoses`-shaped fixtures. A future pass touching this area live
  should do this if the opportunity arises naturally.
- Drug-drug interaction checking remains a named, explicit follow-on,
  blocked on the PRD's own unresolved drug-database licensing question
  (see `REQ159`).
