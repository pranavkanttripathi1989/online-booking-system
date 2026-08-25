---
id: CTX-findings-register-2026-08-26-pickup
type: bug
feature: cross-cutting
created: 2026-08-26
updated: 2026-08-26
status: done
parent: null
related: [BUG024, BUG025, BUG026, BUG027, REQ074, REQ075, REQ076, REQ077, REQ078]
---

# A 10-finding pick-up from project-plans/02-findings-register.md (2026-08-26)

One combined bundle for a heterogeneous batch spanning `patients`,
`security`, `test-results`, `messaging`, `test-coverage-audit`,
`repo-hygiene`, `organization-branding`, and `frontend-platform` — unlike
the prior `REQ066`–`REQ073` batch (one coherent PRD-residue theme, 8
separate bundles), these 10 findings share no single feature theme, so
one bundle covering the whole pick-up plus the register's own updated
status lines is more proportionate than 9 near-empty per-finding ones.

## What was picked, and why

The user asked what was pending in `project-plans/02-findings-register.md`
(the original 2026-08-22 codebase audit), then asked for 10 more to be
picked up and worked, continuing this session's established "pick N and
work through them" pattern. Every finding not already marked closed in
the register was re-verified against the current code first — ~30
slices had shipped since 2026-08-22, and several turned out already
closed or substantially mitigated (`F-03`, `F-09` partially, `F-14`,
most of `F-15`, `F-16`, `F-24` partially, `F-28` partially) — status
lines were added at each finding's own section documenting this rather
than leaving the register stale, matching the user's own explicit
follow-up instruction to update the doc with new findings.

## The 10 selected, and outcome

| Finding | Doc | Outcome |
|---|---|---|
| F-04 | `BUG024` | Fixed — `Patients.client_org_id` |
| F-05 | `BUG025` | Fixed — `Patient.appointments` scoping |
| F-06 | `BUG026` | Fixed — role/permission mutation guards |
| F-08 | `BUG027` | Fixed — `orderTest` `patient_id` |
| F-15 | `REQ074` | Fixed (re-scoped — 3 of 4 named instances already closed) |
| F-19 | `REQ077` | Ratchet only (lint rule), not the 90-file sweep |
| F-21 | `REQ078` | Verified already closed for the 4 scoped pages |
| F-27 | `REQ075` | Fixed — 2 negative-RBAC e2e scenarios |
| F-31 | `REQ076` | Fixed — repo root cleanup |
| F-33 | — | **Blocked** — see below |

## F-33 blocked, not silently skipped

The prescribed first step — `ALTER ROLE medibook PASSWORD '...'`
against the live, running `medibook_postgres` container — was blocked
by this session's own auto-mode permission classifier as a
hard-to-reverse action against running shared infrastructure. No
workaround was attempted; the user was told directly and offered the
exact command to run themselves. Still open pending explicit sign-off —
see the register's own updated F-33 section.

## Real bugs found along the way, not part of the original findings

1. **`test/integration/tenancy.int-spec.ts`'s own `patients` fixture**
   had no `client_org_id` — broke immediately after `BUG024`'s schema
   change, since the fixture predated the column. Fixed by stamping it,
   matching how `productCategories`/`products` fixtures already do.
2. **`frontend/e2e/rbac-negative.spec.js`'s own `psql()`-result
   handling** — an `INSERT ... RETURNING id` prints the id *and* a
   second `INSERT 0 1` status line under `psql -t -A`; the shared
   `.trim()`-only helper didn't strip it, so a cross-org id assertion
   passed for the wrong reason and cleanup silently left a residue row.
   Found and fixed before the spec could be trusted — see `REQ075`.

## Verification

Full backend suite: 84/84 suites, 1317/1317 tests (one pre-existing,
host-load-flaky `account.service.spec.ts` failure under full-parallel
contention, confirmed passing 30/30 in isolation). Integration: 4/4
suites, 369/369 tests. `eslint`/`tsc --noEmit`: clean. Frontend:
`npm run lint` (0 errors, new 1951-warning ratchet baseline), `npm test`
(5 suites flaky under full-parallel contention — the same 4
pre-existing plus 1 new, `manager/pharmacy/index.test.jsx`, all 5
confirmed passing in isolation, none import a file this batch touched),
`npm run build` (succeeded). New `frontend/e2e/rbac-negative.spec.js`:
3/3 passing against the real stack, confirmed zero residue.

Live-verified against the real dev stack: `patients`/`createPatient`
(F-04), `patient(id).appointments` (F-05), `updateRolePermissions`
system-role/unknown-permission rejection (F-06), `orderTest`
`patient_id` write + required-field validation (F-08), `threads`
batched-participants query (F-15).
