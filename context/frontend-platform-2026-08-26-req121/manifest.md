---
id: CTX-frontend-platform-2026-08-26-req121
type: improvement
feature: frontend-platform
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ121
related: [PLAN161, TP181, TR181]
---

# frontend-platform — REQ121: cache-and-network audit round 2 (2026-08-26)

Eighth slice of the next 10-slice batch (`project-plans/analysis/11-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ121 | [Cache-and-network audit round 2](../../requirements/frontend-platform/improvement/REQ121-frontend-platform-2026-08-26-cache-and-network-audit-round-2.md) |
| implementation-plans | PLAN161 | [implementation plan](../../implementation-plans/frontend-platform/improvement/PLAN161-frontend-platform-2026-08-26-cache-and-network-audit-round-2.md) |
| test-plans | TP181 | [verification plan](../../test-plans/frontend-platform/improvement/TP181-frontend-platform-2026-08-26-cache-and-network-audit-round-2.md) |
| test-results | TR181 | [verification results — pass](../../test-results/frontend-platform/improvement/TR181-frontend-platform-2026-08-26-cache-and-network-audit-round-2.md) |

## What shipped

Continuation of `REQ078`'s own F-21 verification pass, which explicitly
scoped itself to four already-correct pages and left every other page
unaudited. This slice: `fetchPolicy: 'cache-and-network'` added to 7
query sites across `staff/index.jsx`, `reviews/index.jsx`,
`admin/users/index.jsx`, `clinician/Calendar.jsx`, and
`manager/Dashboard.jsx` — a bounded, judged set of genuinely
stale-prone pages, not the global Apollo default (deliberately still
out of scope, matching `REQ078`'s own stated blast-radius reasoning).

## Verification

Frontend: `eslint` clean on all 5 touched files (0 errors, only
pre-existing warnings). No backend change. No GraphQL contract change
on any of the 7 query sites. Live verification not performed — shared
dev backend mid-flight on unrelated concurrent work; a `fetchPolicy`
config change is also lower-risk to verify by inspection given the
already-proven `cache-and-network` contract from `REQ078`'s own four
pages.
