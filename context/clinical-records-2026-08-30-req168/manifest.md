---
id: CTX-clinical-records-2026-08-30-req168
type: requirement
feature: clinical-records
created: 2026-08-30
updated: 2026-08-30
status: done
parent: PP-PHASE2
related: [REQ168, PLAN231, TP251, TR251]
---

# Chronic-disease registries (diabetes/HTN) + recall (P2-12, 2026-08-30)

Picked up via bare `continue` immediately after `P2-11` (immunisation
tracker). Confirmed via a full research pass: nothing chronic-disease-
specific exists anywhere, and the phase-plan row's own "cohort reports
already built" note refers to `REQ029`'s `getPatientReportGroup()` —
entirely visit/acquisition-based, reusable only as a query-shape
template (the `appointments: {none: {...}}` "hasn't come back" pattern),
not as extendable diagnosis-aware logic.

## Design

A persisted, clinician-confirmed enrollment (`ChronicRegistryEnrollments`,
mirroring `TestResults`/`ImmunizationRecords`' own patient-direct shape),
never a live diagnosis-code join — `Diagnoses.icd10_code` is free text
with no guaranteed cleanliness. A `chronicRegistrySuggestions(condition)`
query scans for known ICD-10 prefixes among not-yet-enrolled patients and
returns candidates to confirm, mirroring `REQ018`'s own
suggest-don't-auto-commit precedent. Two fixed conditions (`diabetes`,
`hypertension` — the slice's own title names a pair, not a framework),
one fixed 90-day review interval (a stated simplification). The daily
recall sweep deliberately notifies clinic staff (admin/manager), not the
patient — the reverse of `REQ167`'s own patient-facing reminder, since
this is a population-health outreach list mirroring
`low-stock-sweep.service.ts`'s own "notify org staff" shape.

Frontend: `manager/registries/index.jsx`, mirroring
`manager/memberships/index.jsx`'s own `client.query`/`client.mutate`
structure — condition tabs, an enrolled-patient table with a recall-status
chip, a Suggested Candidates panel. New route with its own dedicated
`RoleGuard` (clinician/staff need access, broader than the shared
admin/super_admin/manager block neighbouring routes sit in — same
precedent as `/queue`/`/waiting-room`'s own dedicated blocks) and a
top-level nav entry (mirrors Pharmacy/Insurance Claims' own
staff-inclusive placement).

## One real correction made mid-slice, before committing

The first draft classified `chronic-registries` `EXEMPT` in the tenancy
matrix, reasoning it had no fixture data to hang a case off. Wrong:
`EXEMPT` is reserved for domains with no tenant-scoped list-query shape at
all, and `registryEnrollments` genuinely has one
(`orgScopeVia(user, 'patient')`, the identical helper `test-results`/
`packages`/`memberships` already use). Fixed by adding real fixture rows
and a proper `CASES` entry instead — the integration suite's count moving
from 432 to 441 tests confirms it's genuinely exercised, not just present.

## Verification

Backend: 134 suites / 2124 tests (23 new), integration 9/9 suites / 441
tests, `tsc --noEmit` + `eslint` clean. Frontend: `manager/registries
/index.test.jsx` 4/4 new; full suite 357/369 with the 4 remaining
failures confirmed pre-existing (one, `patient/Appointments.test.jsx`,
directly verified via `git stash` to fail identically with none of this
session's changes present at all) and unrelated to any file this slice
touched. `eslint` clean; production build clean. Live: migrations
applied, backend restarted with a clean compile, GraphQL introspection
and `schema.gql` both confirmed the new types/operations on the running
schema.

See `PLAN231`/`TP251`/`TR251` for full detail.
