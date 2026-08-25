---
id: CTX-compliance-dpdp-2026-08-25-req073
type: improvement
feature: compliance-dpdp
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ073
related: [PLAN100, TP127, TR126]
---

# compliance-dpdp — Retention policies and purge (2026-08-25)

One of an 8-slice batch. Closes `REQ034`'s own `US-DPDP-06`: new
`RetentionPolicies` master data plus a daily `RetentionPurgeService` that
soft-deletes past-retention `test_results` rows, honoring `legal_hold`.
Deliberately scoped to one data class today — see `REQ073`'s own account
of why `clinical_records`/`consents`/`messages` are documentable but not
enforced yet.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ073 | [Retention policies and purge](../../requirements/compliance-dpdp/improvement/REQ073-compliance-dpdp-2026-08-25-retention-policies-and-purge.md) |
| implementation-plans | PLAN100 | [implementation plan](../../implementation-plans/compliance-dpdp/improvement/PLAN100-compliance-dpdp-2026-08-25-retention-policies-and-purge.md) |
| test-plans | TP127 | [test plan](../../test-plans/compliance-dpdp/improvement/TP127-compliance-dpdp-2026-08-25-retention-policies-and-purge.md) |
| test-results | TR126 | [results](../../test-results/compliance-dpdp/improvement/TR126-compliance-dpdp-2026-08-25-retention-policies-and-purge.md) |

## Live verification

`setRetentionPolicy`/`retentionPolicies` confirmed against the real dev
DB; left in place as inert reference data (nothing in the dev DB is old
enough to be affected). The purge sweep's cron trigger is covered by
unit tests only — a deliberate choice, not an oversight, for an
automated data-destruction job against a real dev database.
