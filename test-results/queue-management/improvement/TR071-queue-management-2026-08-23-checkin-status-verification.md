---
id: TR071
type: improvement
feature: queue-management
created: 2026-08-23
updated: 2026-08-23
status: pass
parent: TP072
related: [PLAN045, REQ042]
---

# TR071 — Results: check-in status tracking and the waiting-room queue

All 13 cases in `TP072` pass.

- Unit: 8 new tests in `appointments.service.spec.ts` (26 total in that
  file now, up from 18) — all green. Full backend suite: **716/716 tests,
  55 suites**. `tsc --noEmit`/`eslint` clean.
- `check-page-data-wiring.mjs`: `✓ page data-wiring gate: 2 known-fabricated,
  0 new` (down from 3 known-fabricated before this slice) — after fixing
  the script's own pre-existing Windows path bug (`fileURLToPath` instead of
  `new URL(...).pathname`), confirmed it had never actually run
  successfully on this host outside a Linux container before.
- Frontend: `eslint` clean; full Jest suite **63/63 passed**, no regression.
- Live e2e (`frontend/e2e/waiting-room.spec.js`, against the real dev
  backend, not mocked): both new tests pass. One retry was needed on the
  first run — a Vite cold-compile delay on the lazily-loaded route's first
  hit exceeded the 15s assertion timeout; the identical page loaded in
  17.6s on a warm retry. Documented, not treated as a real defect — this is
  the same class of first-hit latency already recorded in `TR069` for the
  isolated e2e stack, now also observed against the dev stack's own Vite
  server.

## What this does not close

- No queue position / estimated wait time (depends on `REQ017`/`REQ020`,
  neither built) — see `REQ042`'s own scope note.
- No clinic picker on the waiting-room page itself, even though the backend
  filter now supports `clinic_id` — logged as a small, non-blocking
  follow-up in `REQ042`.
