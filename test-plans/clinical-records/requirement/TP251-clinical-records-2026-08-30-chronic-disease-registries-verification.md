---
id: TP251
type: requirement
feature: clinical-records
created: 2026-08-30
updated: 2026-08-30
status: approved
parent: PLAN231
related: [REQ168, TR251]
---

# TP251 — Verification for chronic-disease registries (diabetes/HTN) + recall (P2-12)

## Suggestion stage

Skipped. Mirrors already-proven patterns (`TestResults`' own scoping
shape, `low-stock-sweep.service.ts`'s own sweep shape, `REQ018`'s own
suggest-don't-auto-commit precedent) rather than a genuinely exploratory
one.

## Per-defect/feature contract

| ID | Case | Expected |
|---|---|---|
| TC-01 | `chronicRegistrySuggestions` — org-scoped diagnosis scan | matches the condition's known ICD-10 prefixes, org-scoped via `encounter.client_org_id` |
| TC-02 | same — patient already enrolled | excluded from suggestions |
| TC-03 | same — multiple matching diagnoses for one patient | deduplicated to one suggestion row |
| TC-04 | `registryEnrollments` — platform operator | no org filter |
| TC-05 | same — org-scoped caller | restricted to their own org |
| TC-06 | `enrollInRegistry` — unknown patient | `BadRequestException` |
| TC-07 | same — patient in a different org (Hard Rule 6) | `NotFoundException` |
| TC-08 | same — patient already actively enrolled for the condition | `BadRequestException` |
| TC-09 | same — a previously resolved enrollment | reactivated in place, no duplicate row (unique-constraint safe) |
| TC-10 | same — never-enrolled patient | new row created |
| TC-11 | `markRegistryReviewed` — enrollment in another org | `NotFoundException` |
| TC-12 | same — in-org enrollment | `last_reviewed_at` reset to now |
| TC-13 | `resolveRegistryEnrollment` — unknown enrollment | `NotFoundException` |
| TC-14 | same — valid enrollment | `status` set to `resolved` |
| TC-15 | recall status computation | `overdue` / `due_soon` / `upcoming` against the fixed 90-day interval |
| TC-16 | recall sweep — nothing overdue | no dispatch |
| TC-17 | recall sweep — an overdue enrollment | every admin/manager in that patient's org notified |
| TC-18 | same — already alerted within 7 days | skipped |
| TC-19 | same — patient has no org | skipped (nothing to notify) |
| TC-20 | same — one org's dispatch throws | the rest of the sweep still completes |
| TC-21 | Registries page — no enrollments/suggestions | real empty states |
| TC-22 | same — a real enrolled patient | correct recall-status chip rendered |
| TC-23 | same — a real suggested candidate | Enroll calls the real mutation, list refetches |
| TC-24 | same — Mark Reviewed action | calls the real mutation, list refetches |
| TC-25 | Tenancy matrix | `registryEnrollments` gets a real `CASES` row (not `EXEMPT` — it has real tenant-scoped data), passes cross-org isolation |
