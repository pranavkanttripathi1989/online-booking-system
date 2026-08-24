---
id: CTX-appointments-2026-08-25-req052
type: improvement
feature: appointments
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ052
related: [REQ018, PLAN075, TP102, TR101]
---

# appointments — REQ052: auto-no-show sweep + configurable intake fields (2026-08-25)

Second slice in the 8-slice batch picked from `project-plans/` this
session (research cross-checked against real code — see the first slice's
own manifest, `queue-management-2026-08-25-req051`, for the full account
of that research pass).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ052 | [auto-no-show + intake fields](../../requirements/appointments/improvement/REQ052-appointments-2026-08-25-auto-no-show-and-intake-fields.md) |
| implementation-plans | PLAN075 | [implementation plan](../../implementation-plans/appointments/improvement/PLAN075-appointments-2026-08-25-auto-no-show-and-intake-fields.md) |
| test-plans | TP102 | [verification plan](../../test-plans/appointments/improvement/TP102-appointments-2026-08-25-auto-no-show-and-intake-fields.md) |
| test-results | TR101 | [verification results — pass, 76/76 + 4/4 suites](../../test-results/appointments/improvement/TR101-appointments-2026-08-25-auto-no-show-and-intake-fields.md) |

## What shipped

`NoShowSweepService` (hourly `@Cron`, reuses the already-existing
`markNoShow()` method — found unbuilt-but-present during exploration),
`Patients.no_show_count` + `ClientOrganizations.no_show_prepayment_threshold`
forcing prepayment on a repeat offender's next booking, and a new
`intake-fields` module (scaffolded identically to `REQ051`'s `checklist`)
for clinic-scoped configurable booking-form fields, validated
server-side and stored on `Appointments.intake_responses`.

## A real bug found via a test failure, not live testing this time

The first draft added a second, unconditional `clinics.findUnique` call to
resolve the no-show threshold, breaking a pre-existing test asserting an
org-less caller never triggers that lookup at all. Consolidated into one
query (used by both the still-conditional ownership check and the
always-run threshold resolution) rather than patching the test to ignore
the smell. Full account in `PLAN075`.

## Direction confirmed mid-slice

User asked whether frontend integration should be part of each remaining
slice. Confirmed via `AskUserQuestion`: stays backend-only through all 8,
one dedicated frontend-completion pass follows afterward — matching how
Phase G+2 was actually executed.

## Verification

Backend unit: 76/76 suites, 1096/1096 tests (was 74/1071). Integration
(from host): 4/4 suites, 333/333 tests (was 324), including a new
`intake-fields` tenancy-matrix domain-case row. `eslint`/`tsc --noEmit`
clean.
