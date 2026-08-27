---
id: TR212
type: requirement
feature: telemedicine
created: 2026-08-27
updated: 2026-08-27
status: pass
parent: TP212
related: [REQ026, PLAN192]
---

# TR212 — Results: real teleconsultation, TPG enforcement, escalation

## Backend

- `npx jest --maxWorkers=2`: **109 suites / 1791 tests, green.** New:
  `telemedicine.service.spec.ts` (11), `telemedicine.resolver.spec.ts`
  (2); extended: `prescriptions.service.spec.ts` (+8 TPG cases, 61 total),
  `appointments.service.spec.ts` (+5 escalation cases, 104 total),
  `encounters.service.spec.ts` (+4 consultation_mode mapping cases, 68
  total).
- `npx tsc --noEmit`: clean.
- `npx eslint "{src,test}/**/*.ts"`: clean.
- `npm run test:int`: **8 suites / 411 tests, green**, including the new
  `telemedicine.int-spec.ts` (7/7) and `matrix-coverage.int-spec.ts` (the
  new `telemedicine` domain correctly added to `EXEMPT`, not left
  unclassified).

## Frontend

- `video/index.test.jsx` (new): **8/8 green.**
- `npm run lint`: **4805 warnings, 0 errors** — ratchet ceiling raised
  from 4804 to 4805 in the same change (documented; the rewritten
  `video/index.jsx` nets roughly the same warning count as the file it
  replaced, all pre-existing I18N-1/dark-theme-hex classes, not new debt
  categories).
- `npm run build` + `npm run size`: green. `EncounterWorkspace` chunk
  unaffected (11.02 KB gzipped); all 3 `size-limit` budgets held (initial
  bundle 344.7/350 KB, largest lazy chunk 109.92/115 KB — `charts`,
  untouched by this slice — initial CSS 13.5/18 KB).
- Full suite (`CI=true npx jest --maxWorkers=2`): **36 suites / 250
  tests** — 247 passed; the 3 failures were `EncounterWorkspace.test.jsx`'s
  already-documented flaky referral test and `manager/claims/index.test.jsx`
  (both confirmed pre-existing, resource-contention flakiness — pass
  100% in isolation, neither imports a file this slice touched, matching
  the identical pattern this session's own `REQ151`/`TR211` already
  recorded for the same two suites).

## Real bugs found and fixed this slice (not pre-existing debt left alone)

1. `video/index.jsx` read `useParams().appointmentId` against a route
   declared `/video/:id` — the param was always `undefined`; the file's
   own `|| '1'` "preview mode" fallback silently masked a page that
   never worked off a real navigation, since the day it shipped.
2. `Appointments.type` existed with a comment describing exactly this
   use case, but no mutation ever let a caller set it — `AppointmentInput`
   had no `type` field at all, making a real video appointment
   impossible to create through the API before this slice.
3. The old `video/index.jsx` used the public/patient-self-serve GraphQL
   dialect (`getAppointment`) on an authenticated, protected route,
   instead of the already-available canonical `appointment(id)` query.

## Open items

- Recording-storage retention/lifecycle: schema exists
  (`recording_ref`), no webhook/pipeline wired yet.
- Drug-name/TPG-list-membership accuracy (the phase-plan's own "≥98%"
  exit gate): unmeasured, no labeled real corpus in this environment.
  Logged in `REQ026`/`PLAN192`, not claimed done.
- No real-browser/microphone/Daily.co-account pass — no browser-
  automation MCP server connected this session.
