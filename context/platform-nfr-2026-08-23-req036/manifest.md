---
id: CTX-platform-nfr-2026-08-23-req036
type: improvement
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ036
related: [REQ035]
---

# platform-nfr — REQ036, getClinicians N+1 fix (2026-08-23)

First slice of `project-plans/analysis/06-execution-plan.md` P3 ("Booking integrity
and scale"). `getClinicians()` batched into a single `reviews.groupBy` call
instead of one `reviews.aggregate()` per clinician.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ036 | [getClinicians N+1 fix](../../requirements/platform-nfr/improvement/REQ036-platform-nfr-2026-08-23-getclinicians-n-plus-1.md) |
| implementation-plans | PLAN038 | [implementation](../../implementation-plans/platform-nfr/improvement/PLAN038-platform-nfr-2026-08-23-getclinicians-n-plus-1.md) |
| test-plans | TP065 | [verification plan](../../test-plans/platform-nfr/improvement/TP065-platform-nfr-2026-08-23-getclinicians-n-plus-1-verification.md) |
| test-results | TR064 | [verification results](../../test-results/platform-nfr/improvement/TR064-platform-nfr-2026-08-23-getclinicians-n-plus-1-verification.md) |
| test-suggestions | — | skipped — batching change against an already-proven pattern |

## What this does not do

- Does not touch `dashboard.service.ts`/`analytics.service.ts` — already
  batched, confirmed during the 2026-08-23 P2/P3 audit.
- Does not verify the non-zero-reviews path live (no real review rows exist
  in the dev database) — unit-tested only.
