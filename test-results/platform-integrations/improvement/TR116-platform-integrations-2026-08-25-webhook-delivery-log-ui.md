---
id: TR116
type: improvement
feature: platform-integrations
created: 2026-08-25
updated: 2026-08-25
status: pass
parent: TP117
related: [REQ063, PLAN090]
---

# TR116 — Results for the webhook delivery log UI (REQ063)

Executed 2026-08-25 against `medibook_backend`/`medibook_postgres` (the
shared dev stack) on `master`. No backend change in this slice.

## Frontend unit — `settings/index.test.jsx` (new)

| Case | Result |
|---|---|
| Real empty state on a webhook with no deliveries | **pass** |
| Real delivery attempts, including a failed one, render | **pass** |

2/2, both passing on the first run. Full frontend unit suite re-run at
the end of the whole A-4–A-8 batch: 18 suites / 116 tests, all passing
(`--runInBand`). `eslint`: 0 errors, 162 warnings (ratchet held). `npm
run build`: clean. `scripts/check-page-data-wiring.mjs`: 0 new
fabricated pages.

## e2e — `gap-analysis-a4-a8.spec.js` (new, shared A-4–A-8 fixture file)

| Case | Result |
|---|---|
| Manager views a real webhook's delivery log after a real event fires against an unreachable endpoint | **pass** |

1/1. This dev DB carries several pre-existing real webhook endpoints
from earlier sessions' own live testing — the test's row locator was
scoped to the specific endpoint URL (`page.locator('tr', {hasText:
...})`) rather than a bare "Delivery Log" button role query, which
otherwise matched 4 ambiguous elements. Confirmed the real event
(`appointment.created`, fired by a live fixture booking) recorded as
`status: 'failed'` against the deliberately unreachable
`https://e2e-unreachable.invalid/hook` — not swallowed, matching this
codebase's own Phase G+2-established webhook-failure verification
pattern. All fixture rows (endpoint, delivery log, probe appointment)
confirmed removed via a direct DB check after the run.

## Commits

See the commits immediately following this test-results doc in `git log`.
