---
id: CTX-platform-nfr-2026-08-23-bug017
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: BUG017
related: [REQ035]
---

# platform-nfr — BUG017, booking-concurrency exclusion constraint (2026-08-23)

Closes `project-plans/06-execution-plan.md` P3.1, the acceptance criterion
`booking-concurrency.int-spec.ts` was written against back in Phase F. The
test itself was found to be broken (a stale `AppointmentInput` shape,
failing GraphQL validation rather than exercising the real bug) and fixed
as part of this same slice, before the constraint work — otherwise
flipping `it.failing` to `it` would have shipped a green test that still
wasn't testing anything real. Cross-referencing `technical-plans/01-phase1-mvp.md`
§3.3 (which designs this exact clinician+room constraint pair together)
also surfaced a second real gap — `create()`'s room assignment has no
availability check at all — closed with a companion room-level constraint
as a data-integrity backstop; the underlying selection-logic gap itself is
open question #14.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | BUG017 | [booking-concurrency exclusion constraint](../../requirements/platform-nfr/bug/BUG017-platform-nfr-2026-08-23-booking-concurrency-exclusion-constraint.md) |
| implementation-plans | PLAN041 | [implementation](../../implementation-plans/platform-nfr/bug/PLAN041-platform-nfr-2026-08-23-booking-concurrency-exclusion-constraint.md) |
| test-plans | TP068 | [verification plan](../../test-plans/platform-nfr/bug/TP068-platform-nfr-2026-08-23-booking-concurrency-exclusion-constraint-verification.md) |
| test-results | TR067 | [verification results](../../test-results/platform-nfr/bug/TR067-platform-nfr-2026-08-23-booking-concurrency-exclusion-constraint-verification.md) |
| test-suggestions | — | skipped — the acceptance test already existed |

## What this does not do

- P3.2 (the timezone model) is untouched — a separate, still-open decision.
- No client-facing "try a different slot" UX added on rejection.
