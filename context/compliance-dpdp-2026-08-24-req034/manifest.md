---
id: CTX-compliance-dpdp-2026-08-24-req034
type: requirement
feature: compliance-dpdp
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ034
related: [PLAN067, TP094, TR093]
---

# compliance-dpdp — REQ034 slice: consent capture + data-subject rights requests (2026-08-24)

Third of eight requirement slices in this pass (REQ018 → REQ032 →
**REQ034** → REQ022 → REQ030 → REQ031 → REQ015 → REQ029).

## Documents

| Root | ID | Doc |
|---|---|---|
| implementation-plans | PLAN067 | [consent capture + rights requests](../../implementation-plans/compliance-dpdp/requirement/PLAN067-compliance-dpdp-2026-08-24-consent-and-rights-requests.md) |
| test-plans | TP094 | [verification plan](../../test-plans/compliance-dpdp/requirement/TP094-compliance-dpdp-2026-08-24-consent-and-rights-requests.md) |
| test-results | TR093 | [verification results — pass](../../test-results/compliance-dpdp/requirement/TR093-compliance-dpdp-2026-08-24-consent-and-rights-requests.md) |

## What shipped

`Consents` (purpose-specific, individually withdrawable, append-only
audit trail) and `RightsRequests` (access/correction/erasure, a
request-queued-for-admin-review row, never instant self-service
deletion). Reuses `REQ018`'s dependant-aware patient self-scope pattern,
built correctly from day one on a brand-new domain.

## The key design decision

A healthcare app cannot let a patient erase a record still under
statutory retention automatically — the requirement doc's own Open
Questions section requires erasure to respect any legal-hold override
"with a clear explanation... rather than a silent refusal." This slice's
job is capturing and SLA-tracking the request (30-day default window); an
admin applies the actual outcome by hand via `resolveRightsRequest`, a
status change, never a data-mutation trigger.

## What's deliberately NOT built

`DisclosureLog`, `RetentionPolicies`, the breach-response runbook (P1/P2,
or process rather than code), and any automated erasure/correction
execution.

## Next in this pass

REQ022 (pharmacy batch/stock ledger).
