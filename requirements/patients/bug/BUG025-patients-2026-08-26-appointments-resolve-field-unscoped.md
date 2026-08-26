---
id: BUG025
type: bug
feature: patients
created: 2026-08-26
updated: 2026-08-26
status: done
parent: null
related: [BUG024]
---

# BUG025 — `Patient.appointments` resolve-field was completely unscoped

## Source

`project-plans/analysis/02-findings-register.md` F-05, part of the same
10-finding pick-up as `BUG024`. Re-verified still fully open before
starting: `patients.resolver.ts`'s `appointments()` `@ResolveField` took
no `@CurrentUser()` at all.

## The bug, precisely

`appointments(@Parent() patient, first, page)` filtered only on
`{patient_id, is_deleted: false}` — no org scope, no self-scope. A
patient treated at two organisations exposed their **entire cross-org
appointment history** (clinician names, services, clinics) to a
clinician at either one, once that clinician could resolve the parent
`Patient` object (which `findOne()`'s own treated-by check permits).

## Fix

Added `@CurrentUser()` to the resolver and threaded `user` into the
service method. Applies the same `orgScopeVia(user, 'clinic')` +
clinician self-scope `appointments.service.ts`'s own top-level `findAll`
query already uses — this resolve-field now has the identical contract
as the query it mirrors, not a weaker one.

Deliberately does **not** apply a patient-role self-scope on top of the
existing `patient_id` filter: the `where` this feeds into already fixes
`patient_id` to the specific parent `Patient` being resolved (the
caller's own, or a genuine dependant's — already validated by
`findOne()` before this resolve-field can even run). Adding a second,
caller-derived `patient_id` filter here would have silently broken the
dependant case (showing nothing) instead of restricting it.

## Acceptance criteria (Given/When/Then)

- **Given** a patient with appointments at two different orgs, **when** a
  clinician at org A resolves that patient's `appointments` field,
  **then** only org-A appointments are returned.
- **Given** a clinician resolving a patient's `appointments`, **then**
  only appointments where that clinician was the treating clinician are
  returned (matching the top-level query's own contract).
- **Given** a patient viewer resolving a genuine dependant's
  `appointments`, **then** the dependant's own appointments are returned
  — not silently empty from an incorrectly-applied self-scope.
- **Given** a platform operator, **then** no org filter is applied.

## Traceability

`project-plans/analysis/02-findings-register.md` F-05.
