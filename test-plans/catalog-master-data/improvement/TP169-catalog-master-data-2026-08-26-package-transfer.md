---
id: TP169
type: improvement
feature: catalog-master-data
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN150
related: [REQ110]
---

# TP169 — Test plan: package transfer between patients

Skipping the test-suggestion stage per `CLAUDE.md`'s conditional rule —
a well-scoped slice against an already-proven pattern (the existing
`purchasePackage`/`{success, userErrors, patientPackage}` shape, and the
`isSameOrg`/`isPlatformOperator` tenancy helpers already used elsewhere).

## Cases

| # | Case | Expected |
|---|---|---|
| 1 | `transferPackage` — nonexistent `patient_package_id` | `{success: false}`, "Package not found" |
| 2 | `transferPackage` — package belongs to a different org (cross-tenant) | `{success: false}`, "Package not found" (not a leaked 403/404 distinction) |
| 3 | `transferPackage` — package's `expires_at` is in the past | `{success: false}`, "This package has expired" |
| 4 | `transferPackage` — `sittings_remaining < 1` | `{success: false}`, "This package has no sittings remaining to transfer" |
| 5 | `transferPackage` — `to_patient_id` equals the package's current `patient_id` | `{success: false}`, "This package already belongs to that patient" |
| 6 | `transferPackage` — target patient in a different org | `{success: false}`, "Target patient not found" |
| 7 | `transferPackage` — happy path | Updates `PatientPackages.patient_id`, writes one `PackageTransferLog` row with `sittings_at_transfer` = the pre-transfer remaining count, returns `{success: true, patientPackage}` |
| 8 (regression) | `patientPackages()` for an org-less (platform-operator) caller | Returns **every** org's rows, not zero — the F-01/BUG004 bug class the pre-existing ternary reintroduced |
| 9 (frontend) | Packages tab — empty state | "No packages purchased for this patient yet." when `patientPackages` returns `[]` |
| 10 (frontend) | Packages tab — real purchased package renders | Shows package name, `sittings_remaining / sittings_total`, and an "Active" status chip |
| 11 (frontend) | Transfer action disabled for a fully-redeemed package | `sittings_remaining < 1` → the transfer `IconButton` is disabled, labelled via `aria-label` (not just the `Tooltip`, per this codebase's own documented "Tooltip without aria-label" bug class) |
| 12 (frontend) | Transfer dialog — real `transferPackage` mutation round trip | Selecting a target patient via the shared patient-search `Autocomplete` and confirming calls the real mutation with the correct `input`, then refetches `patientPackages` |
