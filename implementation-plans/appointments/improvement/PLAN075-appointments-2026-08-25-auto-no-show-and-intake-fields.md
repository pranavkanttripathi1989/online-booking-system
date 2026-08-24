---
id: PLAN075
type: improvement
feature: appointments
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ052
related: [REQ018, PLAN074]
---

# PLAN075 — Implementation plan: auto-no-show sweep + configurable intake fields

## Scope

`REQ052` (`US-BOOK-04`/`US-BOOK-06`, `REQ018`'s own P1 remainder) — an
hourly cron auto-marks abandoned `confirmed` appointments as `no_show`,
tracks a per-patient repeat-no-show count that forces prepayment on their
next booking once it crosses a per-org threshold, and clinic-scoped
configurable intake fields collected at booking time.

## Design

**No-show sweep** — new `NoShowSweepService` (`backend/src/appointments/
no-show-sweep.service.ts`), `@Cron('0 * * * *')` copying
`ScheduledReportsService`'s exact pattern. Queries `confirmed`, non-deleted
appointments; for each, compares `now` against `appointment_time +
clinic.client_organization.no_show_grace_minutes` (org-configurable,
default 30). Past the deadline, reuses the **already-existing**
`AppointmentsService.markNoShow(id, user)` (found during exploration —
`'no_show'` was already a real, tested status value; nothing new needed
there) via a synthetic system caller (`{ sub: 'system', roles: ['admin'],
client_org_id: null }`, the same `isPlatformOperator`-bypasses-org-scoping
pattern `ScheduledReportsService`'s own cron already uses), then
increments `Patients.no_show_count`. One failing row logs and continues
rather than aborting the whole sweep.

**Repeat-no-show prepayment override** — `Patients.no_show_count` +
`ClientOrganizations.no_show_prepayment_threshold` (default 3). In
`AppointmentsService.create()`, `initialStatus` becomes `awaiting_payment`
when *either* `service.prepayment_policy === 'required'` (existing,
`REQ018`) *or* the patient's `no_show_count` has reached the org's
threshold — one shared prepayment mechanism, not two parallel ones.

**Intake fields** — new top-level `backend/src/intake-fields/` module,
scaffolded identically to `checklist` (`REQ051`, same session): `{success,
userErrors, entity?}` mutations, `findScopedClinic`/`findOwned` cross-org
guards, an optional `clinic_id` query argument (omitted -> every field
across the caller's own org, given -> scoped to one clinic + product). A
new `Appointments.intake_responses Json?` column stores `{ [key]: value
}`; exposed via GraphQL as a structured `[IntakeFieldResponseType!]` list
(this codebase's established convention for every other Json column —
`recipients_json`/`feature_flags_json` are similarly never raw scalars),
not a JSON scalar. `AppointmentInput.intake_responses` accepts a
`[IntakeFieldResponseInput!]` array (`key`/`value` pairs), validated with
`@ValidateNested({ each: true }) @Type(() => IntakeFieldResponseInput)` —
the exact pattern `prescriptions`' own array-of-nested-input fields
already use.

`AppointmentsService.create()` calls `IntakeFieldsService.forBooking
(clinic_id, service_id)` (clinic-wide + this service's own fields) and
rejects with the missing labels named if any `is_required` field wasn't
answered — server-side enforcement, the client-supplied set is never
trusted alone for which fields even apply.

**Org booking policies** — `OrgBookingPoliciesType`/
`UpdateOrgBookingPoliciesInput` (the existing `admin/Policies.jsx`
"Booking Policies" tab contract) gained `no_show_grace_minutes`/
`no_show_prepayment_threshold`, matching the exact existing field-mapping
pattern in `org-settings.service.ts`'s `toBookingPolicies()`/
`updateMyBookingPolicies()` — both fields live directly on
`ClientOrganizations`, same as `slot_buffer_minutes`/
`max_reschedules_per_month` already do.

## A real bug found and fixed during this pass, via a test failure

The first draft added a **second**, unconditional `clinics.findUnique`
call in `create()` to resolve the no-show threshold (separate from the
existing org-ownership-check lookup, which only runs `if
(user.client_org_id)`). This broke an existing test asserting an org-less
caller never triggers `clinics.findUnique` at all — a real design smell,
not just a stale test: two separate queries for the same row is wasteful,
and the test's failure correctly flagged that the *reason* for the
org-less-caller exemption (skip the tenant-ownership check) doesn't apply
to the *new* lookup's purpose (resolve a threshold, needed regardless of
caller org). Fixed by consolidating into one `clinics.findUnique({...,
include: { client_organization: true } })` at the top of `create()`, used
by both the (still caller-org-conditional) ownership check and the
(always-run) threshold lookup. The test itself was then updated to assert
what it actually guarantees — an org-less caller is never rejected for a
clinic-ownership mismatch — rather than the now-outdated "the lookup never
happens" assumption.

## Testing

`no-show-sweep.service.spec.ts` (new, 5 cases): marks + increments past
grace period; leaves an appointment within its (org-specific) grace period
alone; falls back to the 30-minute default when the org has none
configured; continues sweeping remaining rows if one throws; only ever
queries `confirmed`/non-deleted appointments.

`intake-fields.service.spec.ts` (new, mirrors `checklist.service.spec.ts`
structure): list (own-clinic, cross-org rejected, no-clinic-id org-wide
path, platform operator), create (in-scope, cross-org clinic rejected, a
product from a different clinic rejected), update/remove (cross-org
rejected), `forBooking` (clinic-wide + product-specific scoping).

`appointments.service.spec.ts` — 3 new describe blocks in `create`:
repeat-no-show prepayment override (forces `awaiting_payment` at
threshold, not below it, respects a per-org configured threshold not a
hardcoded one), intake fields (stores responses as JSON, rejects a missing
required field naming it, accepts when answered, doesn't require an
optional field), plus the one existing test fixed per the bug account
above.

`org-settings.service.spec.ts` — 2 new cases for the two new
`OrgBookingPolicies` fields (read + update).

`test/integration/setup/domain-cases.ts` gained an `intake-fields` domain
case (same no-args shape as `checklist`'s).

Full suite: backend unit — 76/76 suites, 1096/1096 tests (was 74/1071
after `REQ051`). `npm run test:int` (from host) — 4/4 suites, 333/333
tests (was 324). `eslint`/`tsc --noEmit` clean.

## Out of scope (deferred, not silently dropped)

Frontend UI — backend-only, matching this session's confirmed direction
(all 8 slices in this batch stay backend-only; one dedicated
frontend-completion pass follows once every slice ships, matching how
Phase G+2 was actually executed). A staff notification when the sweep
runs (silent, matching `AppointmentStatusLogs`' existing audit-trail
convention). A UI for building intake-field templates reusable across
multiple clinics (a flat per-clinic list, matching `REQ051`'s own scoping
decision).
