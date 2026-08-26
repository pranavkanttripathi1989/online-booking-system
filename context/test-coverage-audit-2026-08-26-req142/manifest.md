---
id: CTX-test-coverage-audit-2026-08-26-req142
type: improvement
feature: test-coverage-audit
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ142
related: [PLAN182, TP202, TR202]
---

# test-coverage-audit — REQ142: F-28 residue, e2e stack targeting confirmed (2026-08-26)

Ninth slice of the next 10-slice batch (`project-plans/13-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ142 | [E2E stack targeting confirmed](../../requirements/test-coverage-audit/improvement/REQ142-test-coverage-audit-2026-08-26-e2e-stack-targeting-confirmed.md) |
| implementation-plans | PLAN182 | [implementation plan](../../implementation-plans/test-coverage-audit/improvement/PLAN182-test-coverage-audit-2026-08-26-e2e-stack-targeting-confirmed.md) |
| test-plans | TP202 | [verification plan](../../test-plans/test-coverage-audit/improvement/TP202-test-coverage-audit-2026-08-26-e2e-stack-targeting-confirmed.md) |
| test-results | TR202 | [verification results — pass](../../test-results/test-coverage-audit/improvement/TR202-test-coverage-audit-2026-08-26-e2e-stack-targeting-confirmed.md) |

## What shipped

F-28's own status line named a genuine open question: "whether every
e2e spec actually runs against [the isolated] stack rather than the
shared dev database... not independently re-investigated spec-by-spec."
This slice does exactly that, live, against the real running Docker
stack:

- Corrected a first, wrong assumption before it reached the register:
  `seed-e2e.ts` deliberately mirrors the dev seed's fixture names, so
  matching-name grep isn't proof of which stack a spec targets.
- Confirmed the real, structural evidence instead:
  `playwright.config.js` defaults to the dev frontend, `npm run e2e`
  sets no override, and only 5 of ~190+ verification documents ever
  mention the isolated runner.
- **Found and fixed a real infrastructure gap live**: `medibook_backend_e2e`
  was completely broken (357 TS errors — stale Prisma Client, missing
  `pdfkit` in `node_modules`) despite `docker ps` showing it "up."
  Repaired via `prisma generate` + `npm install` + restart, confirmed
  via a real GraphQL round trip.
- Reproduced `TR069`'s own "full suite never completes cleanly"
  pattern at small scale: a fresh run against the just-repaired stack
  hit a cold-start timeout on its first test, then passed cleanly on a
  second, warm run.
- Fixed a real `TS2532` in `REQ140`'s own new tests, surfaced by the
  repaired container's own type-checker.

**Conclusion**: the isolated stack's design is real and reasonably
sound; it is simply not what any actual workflow in this codebase
exercises, and its own operational fragility (staleness between uses,
cold-start timing) is an independent reason why, beyond habit alone.

## Verification

Backend: 93/93 unit suites, 1565/1565 tests, unchanged after the
strictness fix. `tsc --noEmit` clean. Live: `medibook_backend_e2e`
repaired and confirmed healthy; `auth-login.spec.js` run twice against
it (1/2 then 2/2 pass) — the strongest evidence available this slice,
a real live run against the real isolated stack, not an inference from
reading code.
