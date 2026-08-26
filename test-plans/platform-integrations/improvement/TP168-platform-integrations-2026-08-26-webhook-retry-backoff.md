---
id: TP168
type: improvement
feature: platform-integrations
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN152
related: [REQ112]
---

# TP168 — Test plan: webhook delivery retry with exponential backoff

Skipping the test-suggestion stage per `CLAUDE.md`'s conditional rule —
additive extension to an already-tested delivery pipeline.

## Cases

| # | Case | Expected |
|---|---|---|
| 1 | A failed delivery (non-2xx) | Writes `status: 'failed'`, `attempt_number: 1`, `next_retry_at` ≈ now + 1 min |
| 2 | `retryOne` at attempt 6 that still fails | Writes `status: 'exhausted'`, `next_retry_at: null` |
| 3 | `retryOne` at attempt 2 that succeeds | Writes `status: 'succeeded'`, no `next_retry_at` |
| 4 | A decrypt failure | Returns early, writes no delivery log row at all |
| 5 | Sweep query | Filters to `status: 'failed'` with a due `next_retry_at`, ignoring `succeeded`/`exhausted` and not-yet-due rows |
| 6 | Sweep — deactivated endpoint | Skipped, no retry attempted |
| 7 | Sweep — retry call | Uses `attempt_number + 1`, not a hardcoded value |
| 8 (frontend, pre-existing bug found) | Delivery Log chip color | A `succeeded` entry renders the success color; previously compared against `'success'` (never matches the real `'succeeded'`/`'failed'`/`'exhausted'` values), so every delivery rendered red regardless of outcome |
