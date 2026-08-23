---
id: CTX-platform-nfr-2026-08-23-bug018
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: BUG018
related: [PLAN043, TP070, TR069, BUG017, BUG007, appointments-2026-08-23-bug019]
---

# platform-nfr — BUG018, P1.5 isolated e2e stack + seed-script fixes (2026-08-23)

Closes `project-plans/06-execution-plan.md` P1 item 1.5, the last item in
P1 ("prove the boundary") — a realistic seed dataset in a separately seeded
e2e database, isolated from the shared dev stack. `PLAN043` is the stack
itself (docker-compose `e2e` profile, `seed-e2e.ts`, Playwright wiring);
`BUG018` is five real defects found and fixed while building and validating
it at real volume, none of which the shared dev stack's ~4 appointments
could ever have surfaced.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | BUG018 | [seed-script exclusion-constraint collision](../../requirements/platform-nfr/bug/BUG018-platform-nfr-2026-08-23-seed-script-exclusion-constraint-collision.md) |
| implementation-plans | PLAN043 | [isolated e2e stack](../../implementation-plans/platform-nfr/bug/PLAN043-platform-nfr-2026-08-23-isolated-e2e-stack.md) |
| test-plans | TP070 | [verification plan](../../test-plans/platform-nfr/bug/TP070-platform-nfr-2026-08-23-isolated-e2e-stack-verification.md) |
| test-results | TR069 | [verification results](../../test-results/platform-nfr/bug/TR069-platform-nfr-2026-08-23-isolated-e2e-stack-verification.md) |
| test-suggestions | — | skipped — a well-scoped bug-fix/infrastructure slice, not exploratory |

## What this closes

- `project-plans/06-execution-plan.md` P1 item 1.5 — P1 as a whole is now
  **complete** (1.1–1.6 all done).
- The `07-prd-gap-analysis-and-roadmap.md` gate ("P0–P1 must complete before
  any REQ014–035 implementation planning begins") is now satisfied.

## What this surfaced but deliberately left open

- `appointments-2026-08-23-bug019` (separate bundle) — a real, previously
  undiscoverable app bug (today's appointments can fall outside the default
  calendar/list window at realistic volume), found by this same stack,
  deliberately documented rather than fixed or routed around in the seed.
- `finances/index.jsx`'s lack of pagination on `myFinanceTransactions` —
  additional live evidence for the already-tracked, still-open F-14/`REQ039`
  gap, not a new finding.
- No clean, uninterrupted full e2e run against the isolated stack was
  achieved this session — three attempts, three different incomplete
  outcomes, root-caused as an environmental limitation of this session/host
  rather than a code defect. See `TR069` for the full account and the
  genuine (partial but real) evidence gathered anyway.
