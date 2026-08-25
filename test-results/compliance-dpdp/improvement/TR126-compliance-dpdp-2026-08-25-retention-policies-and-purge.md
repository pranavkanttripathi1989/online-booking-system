---
id: TR126
type: improvement
feature: compliance-dpdp
created: 2026-08-25
updated: 2026-08-25
status: pass
parent: TP127
related: [REQ073, PLAN100]
---

# TR126 — Results for retention policies and purge (REQ073)

Executed 2026-08-25 against `medibook_backend`/`medibook_postgres` on
`master`, as part of an 8-slice batch.

## Unit

`consent.service.spec.ts`: 16/16 pass (4 new). `retention-purge.service.spec.ts`
(new): 5/5 pass. Full backend suite (run once at the end of the batch):
**84 suites / 1293 tests**, all passing. Integration: **4 suites / 369
tests**, all passing. `eslint`: 0 errors. `tsc --noEmit`: clean.

## Live verification

`setRetentionPolicy(data_class: 'test_results', retention_years: 7)`
against the real dev DB, read back correctly via `retentionPolicies`.
Left in place as inert reference data (nothing in the dev DB is 7 years
old, so the policy has zero live effect today) — not a data-destruction
risk, matching the "new rows stay" convention for test residue. The
purge sweep's own cron trigger was not exercised live; its logic is
covered by 5 dedicated unit cases against a mocked Prisma client.

## Commits

See the commits immediately following this test-results doc in `git log`.
