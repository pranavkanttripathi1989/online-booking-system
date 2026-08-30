---
id: PLAN231
type: requirement
feature: clinical-records
created: 2026-08-30
updated: 2026-08-30
status: done
parent: REQ168
related: [TP251, TR251]
---

# PLAN231 — Chronic-disease registries (diabetes/HTN) + recall (P2-12)

`P2-12` in `project-plans/phase-plans/02-phase2-win-the-midmarket.md`,
picked up via the bare-`continue` resumption protocol immediately after
`P2-11`. Confirmed via a full research pass that nothing chronic-
disease-specific exists anywhere, and "cohort reports already built"
(`REQ029`'s `getPatientReportGroup`) is entirely visit/acquisition-based
— reusable only as a query-shape template (the `appointments: {none:
{...}}` "hasn't come back" pattern), not as extendable logic.

## Design decisions

- **Registry membership is a persisted, clinician-confirmed enrollment,
  never a live diagnosis-code join.** `Diagnoses.icd10_code` is free text
  with no FK to `Icd10Codes` and no guaranteed cleanliness. A
  `chronicRegistrySuggestions(condition)` query scans for known ICD-10
  prefixes (diabetes: `E10`/`E11`/`E13`; hypertension: `I10`–`I13`/`I15`)
  among not-yet-enrolled patients and returns candidates to confirm —
  mirrors `REQ018`'s own patient-dedup-suggestion precedent.
- **Two fixed conditions** (`ChronicConditionType` enum: `diabetes`,
  `hypertension`), not an open catalog — the slice's own title names a
  pair, not a framework.
- **One fixed 90-day review interval** for both conditions — a stated
  simplification, matching the precedent set by `IST_OFFSET_MINUTES`'s
  own fixed-constant note in `notification-trigger.service.ts`.
- **Recall notifies clinic staff (admin/manager), not the patient** — the
  reverse of `REQ167`'s own patient/guardian-facing reminder. This is a
  population-health outreach list for the clinic to work from, mirroring
  `low-stock-sweep.service.ts`'s own "notify org staff" shape.
- No patient self-service view; no `analytics.service.ts` changes — the
  operational registries page covers the real "who needs a call" need.

## What shipped

Backend: `ChronicRegistryEnrollments` (patient-direct, no direct
`client_org_id`, mirrors `TestResults`/`ImmunizationRecords`), new module
`backend/src/chronic-registries/` — `chronicRegistrySuggestions`,
`registryEnrollments` queries; `enrollInRegistry` (reactivates a
previously-resolved row rather than violating the `[patient_id,
condition]` unique constraint), `markRegistryReviewed`,
`resolveRegistryEnrollment` mutations. A daily
`ChronicRegistryRecallSweepService` mirrors `low-stock-sweep.service.ts`'s
exact shape (per-org admin/manager fan-out, 7-day Notifications-table
dedup). One real tenancy-matrix classification correction made mid-slice
(see below).

Frontend: new `manager/registries/index.jsx` (mirrors
`manager/memberships/index.jsx`'s own `client.query`/`client.mutate`
structure) — condition tabs (Diabetes/Hypertension), an enrolled-patient
table with a recall-status chip (new local `recallStatusChipSx`, same
soft-alpha-tint convention as `patients/detail.jsx`'s own
`immunizationStatusChipSx`) and Mark Reviewed/Resolve actions, plus a
Suggested Candidates panel with an Enroll action. New route
`/manager/registries` with its own dedicated `RoleGuard` (clinician/staff
need access, broader than the shared admin/super_admin/manager block the
neighbouring Packages/Memberships routes sit in — mirrors the `/queue`/
`/waiting-room` precedent of a dedicated block rather than widening the
shared one) and a top-level nav entry (mirrors Pharmacy/Insurance Claims'
own staff-inclusive placement).

## One real correction made during the tenancy-matrix pass, not live

`registryEnrollments` genuinely has a real org-scoped list-query shape
(`orgScopeVia(user, 'patient')`, the exact helper `test-results`/
`packages`/`memberships` already use) — an initial draft classified it
`EXEMPT`, which is reserved for domains with *no* tenant-scoped list to
isolate at all (`ai-clinical`/`telemedicine`'s own precedent). Caught
before committing by re-reading the EXEMPT criterion in
`matrix-coverage.int-spec.ts`'s own header comment: this domain has real
data to isolate, so it got a proper `CASES` row with real fixture rows
instead (two `ChronicRegistryEnrollments`, one per fixture org), matching
`memberships`' own precedent exactly.

## Verification

Backend: 134 unit suites / 2124 tests (23 new), integration 9/9 suites /
441 tests (new `chronic-registries` `CASES` row, real fixtures — not
`EXEMPT`), `tsc --noEmit` + `eslint` clean. Frontend: `manager/registries
/index.test.jsx` 4/4 new, `AppShell.test.jsx` unaffected, `eslint` clean
(0 errors), production build clean. Full frontend suite 357/369 — the 4
remaining failures (`patient/Appointments`, `clinician/EncounterWorkspace`,
`manager/claims`, `video/index`) are the same pre-existing resource-
contention flakiness class this session has already confirmed repeatedly
(none import a file this slice touched). Live: migrations applied to the
dev DB, backend restarted with a clean compile, GraphQL introspection
confirmed `chronicRegistrySuggestions`/`registryEnrollments` and all
three mutations on the running schema.
