---
id: REQ123
type: improvement
feature: repo-hygiene
created: 2026-08-26
updated: 2026-08-26
status: done
parent: null
related: [PLAN163, TP183, TR183]
---

# REQ123 — Findings-register freshness (F-10/F-17/F-20/F-32) + a live test-count script

## Why this slice

`project-plans/02-findings-register.md` is the project's own backlog of
record, and this session's own `CLAUDE.md` repeatedly documents the
identical failure mode: a status claim written once, never re-verified,
silently wrong for sessions afterward (the register's own `F-19`/`F-21`
entries already got this treatment on 2026-08-26; `F-10`/`F-17`/`F-20`/
`F-32` had not). Separately, `CLAUDE.md` itself has now hand-typed a
specific suite/test count at least five different times across its own
history, and every single one has gone stale — the backend unit line
alone drifted from "645 tests / 50 suites" to a real 1470/92 without
anyone noticing until this slice re-ran it.

## What was verified, not assumed

Each of the four findings was re-checked against live code/schema
before writing a status line — none were trusted from memory or from
another document's own claim:

| Finding | Verified against | Result |
|---|---|---|
| F-10 (audit log too thin) | `audit-log.interceptor.ts` read in full; `AuditLogs` model in `schema.prisma` | Fully fixed — `resource_id`, `outcome`, sanitised `details`, `user_agent`, both prescribed indexes all present, via `REQ053`'s migration |
| F-17 (no GST fields) | `AppointmentPayments` model in `schema.prisma` | Fully fixed via `REQ047`; one narrower residual gap (`place_of_supply`) already self-documented there |
| F-20 (3 tables lack `TableContainer`) | All three named files, grep-confirmed every `<Table>` is nested inside a `<TableContainer>` | Fixed; the "add an ESLint rule" half of the original fix is still genuinely open |
| F-32 (suite slow in container) | `REQ103`'s own requirement doc and `jest.config.js` | Fixed via `REQ103`, including a correction to this finding's own premise (CI never used the container path to begin with) |

## What shipped

- Status lines added to `F-10`/`F-17`/`F-20`/`F-32` in
  `project-plans/02-findings-register.md`, each citing the real evidence
  above rather than a bare "done".
- `scripts/test-count-status.mjs` — runs the backend unit suite (and,
  with `--integration`, the integration suite too) and prints a dated,
  live suite/test count, matching the existing `scripts/
  check-page-data-wiring.mjs`/`archive-sweep.mjs` convention.
- `CLAUDE.md`'s own backend unit/integration command lines had their
  hand-typed counts removed and replaced with a pointer to the script —
  closing the exact drift this slice's own investigation just measured.

## Deliberately out of scope

- Retroactively fixing every OTHER stale count still written elsewhere
  in `CLAUDE.md` (there are several, per its own admissions) — this
  slice fixes the two backend-suite lines the new script directly
  replaces, not a full document sweep.
- A frontend-equivalent script (lint warning count, e2e spec count) —
  the frontend side already has its own ratchet mechanism
  (`--max-warnings`) serving a similar "don't trust a stale number"
  purpose for lint; a similar live-count script for e2e is a real,
  smaller future improvement, not bundled here.
