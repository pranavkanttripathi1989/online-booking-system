---
id: TR168
type: improvement
feature: platform-integrations
created: 2026-08-26
updated: 2026-08-26
status: done
parent: TP168
related: [PLAN152]
---

# TR168 — Test results: webhook delivery retry with exponential backoff

## TP168 case outcomes

All 8 cases pass. `webhook-dispatch.service.spec.ts` gained a 4-case
"retry scheduling" describe block; new `webhook-retry-sweep.service.spec.ts`
(3 cases) for the new `WebhookRetrySweepService`.

```
PASS src/webhooks/webhook-retry-sweep.service.spec.ts
PASS src/webhooks/webhook-dispatch.service.spec.ts
PASS src/webhooks/webhooks.service.spec.ts

Test Suites: 3 passed, 3 total
Tests:       15 passed, 15 total
```

`npx tsc --noEmit` — clean.

Frontend: `npx eslint src/pages/settings/index.jsx` — 0 errors (44
pre-existing warnings, none new). `settings/index.test.jsx` — 5/5
passing (1 new case).

## A real pre-existing bug found and fixed, unrelated to retry logic itself

While implementing case 8's chip-color update (per `PLAN152`'s own
plan: "an `exhausted` status should render with the same failed red
styling"), found the chip's color condition compared `entry.status ===
'success'` — but the real values written by `webhook-dispatch.service.ts`
have always been `'succeeded'`/`'failed'` (never the bare word
`'success'`). This condition has never matched anything since the
Delivery Log feature shipped (`REQ060`'s A-8 slice) — every delivery,
including a genuine 2xx success, has always rendered as a red error
chip. Fixed to compare against `'succeeded'`, and added a regression
test (case 8) confirming the fix.

## Full backend suite

`npx jest --maxWorkers=2` (whole codebase) confirms zero regressions
from the schema change and the dispatch-service rewrite.
