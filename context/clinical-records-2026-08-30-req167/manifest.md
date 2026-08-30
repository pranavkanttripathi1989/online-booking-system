---
id: CTX-clinical-records-2026-08-30-req167
type: requirement
feature: clinical-records
created: 2026-08-30
updated: 2026-08-30
status: done
parent: PP-PHASE2
related: [REQ167, PLAN230, TP250, TR250]
---

# Immunisation schedule tracker (P2-11, 2026-08-30)

Picked up via bare `continue` per `project-plans/phase-plans/README.md`'s
`▶ CURRENT POSITION` block, which named `P2-11` as the next unstarted,
unblocked slice in `02-phase2-win-the-midmarket.md`. Confirmed the premise
was still real via a full-repo grep (`immuniz`/`vaccin`) before scoping —
genuinely net-new, no prior code anywhere.

## Design

Modeled as a patient-direct clinical fact mirroring `TestResults` exactly
(`patient_id` mandatory, `encounter_id` optional, no direct
`client_org_id`/`clinic_id` — scoped transitively via
`patient_id -> Patients.client_org_id`), plus a platform-global reference
table (`ImmunizationScheduleItems`, seeded with India's National
Immunization Schedule) mirroring `Drugs`/`Languages`'s own
no-admin-CRUD, seed-only convention. New module
`backend/src/immunizations/`, access control mirroring
`encounters.service.ts`'s own `assertPatientAccess()` (duplicated inline
per this codebase's established per-domain-duplicates-its-own-check
convention, not shared via a cross-module dependency). A daily
`ImmunizationReminderSweepService` mirrors `low-stock-sweep.service.ts`'s
exact `@Cron` shape, including its Notifications-table dedup mechanism (no
new schema field needed).

**The one genuine design correction, found during research before any
code was written**: a plain copy of `appointment-reminder-sweep.service
.ts`'s own `resolvePatientUserId()` would silently never notify anyone for
a child patient — this codebase's own documented design is that a
dependant has no login account of its own (the parent/guardian's account
holds the login). Since children are the primary population this feature
targets, the sweep uses `resolveNotifiableUserId()`, falling back through
`PatientRelations` to the guardian's own linked account.

Frontend: one additive "Immunizations" tab (index 10) on
`patients/detail.jsx`, mirroring the file's own established tab/dialog
patterns (status chips via a new `immunizationStatusChipSx` helper,
alongside the existing `statusChipSx`; local inline `gql` operations,
matching the Insurance/Packages/Membership tabs' own convention rather
than the canonical shared `graphql/` files).

## Real bugs found during test-writing (not live)

1. `patientTimeline()`'s new aggregation branch broke every pre-existing
   `encounters.service.spec.ts` test whose mocked Prisma object had no
   `immunizationRecords` key — caught by the full backend suite, fixed by
   adding the missing mock.
2. `patients/detail.jsx`'s first draft sent optional record-dose fields as
   explicit `undefined`-valued keys, which hung the frontend mutation test
   indefinitely (Apollo's `MockedProvider` never matched the request).
   Fixed by conditionally spreading the optional fields in — also the
   correct shape for a genuinely optional GraphQL input field.

## Also fixed this session: a real, live-reported UI-13 bug, unrelated to P2-11's own scope

While live-verifying this slice, the user reported (via screenshot) an
overly-rounded sidebar corner and Notes-field border on
`appointments/edit.jsx`. Two rounds of investigation: an initial fix to
the sidebar's own logo/icon swatch `borderRadius` turned out to be the
wrong target; a direct DOM inspection (`getComputedStyle` on the real
`.MuiDrawer-paper` element) found the actual cause — the sidebar's own
outer `Paper` silently inheriting the theme's global `MuiPaper` default
(`borderRadius: 12`), rounding the entire fixed, full-height sidebar
panel. Fixed at the theme level (`theme/index.js`'s
`MuiDrawer.styleOverrides.paper`), which corrects every sidebar view
app-wide in one change, not just the page it was first noticed on. The
Notes field's own radius was iterated per direct user feedback,
landing on `1.5`.

## Verification

Backend: 132 suites / 2101 tests (26 new), integration 9/9 suites / 432
tests (new `immunizations` `EXEMPT` tenancy-matrix entry, mirroring
`ai-clinical`/`telemedicine`'s own precedent), `tsc --noEmit` + `eslint`
clean. Frontend: `patients/detail.test.jsx` 21/21 (3 new); full suite
355/365 with `--maxWorkers=2` (all 10 remaining failures confirmed
pre-existing resource-contention flakiness, isolated-run clean, none
importing a file this slice touched); `eslint` clean; production build
clean. Live: schedule seeded (25 items), backend restarted with a clean
compile, GraphQL introspection confirmed the new queries/mutation on the
running schema before any test was trusted; sidebar fix confirmed via a
live DOM computed-style check, not just a screenshot.

See `PLAN230`/`TP250`/`TR250` for full detail.
