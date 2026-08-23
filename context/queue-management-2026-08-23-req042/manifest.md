---
id: CTX-queue-management-2026-08-23-req042
type: improvement
feature: queue-management
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ042
related: [REQ019, PLAN045, TP072, TR071, BUG019]
---

# queue-management — REQ042, real check-in status + waiting-room queue (2026-08-23)

First vertical slice of `REQ019`, chosen because it also closes
`project-plans/06-execution-plan.md` P2.2's `waiting-room` third and
resolves `context/open-questions.md` #11(a)'s "lightweight status vs. full
queue/token model" question — for check-in specifically, not for the full
requirement.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ042 | [check-in status + waiting-room queue](../../requirements/queue-management/improvement/REQ042-queue-management-2026-08-23-checkin-status-and-waiting-room-queue.md) |
| implementation-plans | PLAN045 | [implementation](../../implementation-plans/queue-management/improvement/PLAN045-queue-management-2026-08-23-checkin-status-and-waiting-room-queue.md) |
| test-plans | TP072 | [verification plan](../../test-plans/queue-management/improvement/TP072-queue-management-2026-08-23-checkin-status-verification.md) |
| test-results | TR071 | [verification results](../../test-results/queue-management/improvement/TR071-queue-management-2026-08-23-checkin-status-verification.md) |
| test-suggestions | — | skipped — a well-scoped slice against an already-proven pattern (`transitionStatus()`) |

## What this closes

- `project-plans/06-execution-plan.md` P2.2's `waiting-room` third (still
  partial overall — `tasks`/`onboarding` remain).
- `context/open-questions.md` #11(a) — the check-in half only; the
  full queue/token model REQ019 also describes is still open.

## Real, unrelated bug found and fixed

`scripts/check-page-data-wiring.mjs` had a Windows-path bug
(`new URL(...).pathname` vs. `fileURLToPath()`) that meant it had never
actually run successfully from this host outside a Linux container — found
because verifying this slice's allowlist change required running it
locally. Fixed in the same commit.

## What this does not do

- No queue position / wait-time estimation (depends on unbuilt `REQ017`/
  `REQ020`).
- No clinic picker on the waiting-room page (backend `clinic_id` filter
  exists; frontend doesn't expose it yet).
- `staff/Dashboard.jsx`'s removed check-in button/KPI not restored — the
  waiting-room page is the canonical place now.
