---
id: CTX-compliance-dpdp-2026-08-26-req113
type: improvement
feature: compliance-dpdp
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ113
related: [PLAN153, TP167, TR167]
---

# compliance-dpdp — REQ113: retention enforcement extension (consents) (2026-08-26)

Slice of the reconciled 14-slice batch (`project-plans/analysis/10-next-14-slice-batch-reconciled.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ113 | [retention enforcement extension](../../requirements/compliance-dpdp/improvement/REQ113-compliance-dpdp-2026-08-26-retention-enforcement-extension.md) |
| implementation-plans | PLAN153 | [implementation plan](../../implementation-plans/compliance-dpdp/improvement/PLAN153-compliance-dpdp-2026-08-26-retention-enforcement-extension.md) |
| test-plans | TP167 | [verification plan](../../test-plans/compliance-dpdp/improvement/TP167-compliance-dpdp-2026-08-26-retention-enforcement-extension.md) |
| test-results | TR167 | [verification results — pass](../../test-results/compliance-dpdp/improvement/TR167-compliance-dpdp-2026-08-26-retention-enforcement-extension.md) |

## What shipped

`REQ073` left three data classes unenforced by `RetentionPurgeService`:
`clinical_records` (legal-review tension), `messages` (two-party
deletion-scoping question), and `consents` (no `is_deleted` column at
all). This slice picked `consents` — the one purely mechanical blocker
— added `Consents.is_deleted` (migration
`20260826178000_consents_is_deleted`), and extended the sweep to purge
consent rows past their org's configured retention window, with the
clock running from `revoked_at` once revoked, else `granted_at`.
`consent.service.ts#myConsents()` now excludes purged rows.

## Verification

2/2 backend suites, 17/17 tests, `tsc --noEmit` clean. Backend-only —
no frontend page exists for retention policies to extend.
