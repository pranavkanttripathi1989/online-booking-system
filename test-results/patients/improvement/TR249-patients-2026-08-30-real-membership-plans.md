---
id: TR249
type: improvement
feature: patients
created: 2026-08-30
updated: 2026-08-30
status: pass
parent: TP249
related: [REQ166, PLAN229]
commit: pending
---

# TR249 — Patient Membership Plans verification outcomes

## Backend

`npx jest memberships.service.spec --maxWorkers=2` — 20/20 pass. Full
unit suite: **130 suites / 2075 tests, all pass**. `npx tsc --noEmit` —
clean. `npx eslint src/memberships src/app.module.ts` — clean.

Integration: `npm run test:int` — **9/9 suites / 432/432 tests, all
pass**, including the new `memberships` tenancy-matrix domain. First
attempt used `domain: 'membership-plans'` in the `CASES` entry and
failed `matrix-coverage.int-spec.ts`'s own "every resolver domain is
covered, exempt, or a declared known gap" assertion with `unclassified:
["memberships"]` — `resolverDomains()` derives its domain list by
`readdirSync`-scanning the literal `backend/src/<folder>` directory
names, not from any string a `CASES` entry chooses. Fixed by renaming
the entry's `domain` field to `'memberships'` (matching the real
`backend/src/memberships/` folder); suite green on re-run.

## Frontend

`npx jest src/pages/patients/detail.test.jsx --maxWorkers=2` — 18/18
pass (14 pre-existing + 4 new membership tests). `npx jest src/pages/
manager/memberships/index.test.jsx` — 3/3 pass. `npx eslint` — 0 errors
across all touched files. `npm run build` — clean. `npm run size` — all
4 budgets green (330.22/350 kB initial, 109.93/115 kB largest lazy
chunk, 125.06/130 kB RichTextEditor chunk, 13.59/18 kB initial CSS).

## Live verification (Chrome DevTools MCP, real dev stack)

1. As `manager@medibook.dev`, opened `/manager/memberships` (real empty
   state: "No membership plans yet"). Created "Wellness Basic", ₹499
   monthly price, clinic "MG Road Clinic" — real card rendered
   immediately: "Wellness Basic · MG Road Clinic · ₹499.00/mo · Active".
2. As a real caller viewing patient "Priya Patient"
   (`/patients/7ea9442e-e2c6-42a4-85b0-268e59fcb51d`), the header chip
   correctly showed the real "No membership" state (not a mock default).
   Opened the dialog — it listed the real "Wellness Basic · ₹499.00/mo"
   plan just created, plus the client-side "No membership" sentinel
   option.
3. Clicked "Wellness Basic" to enroll — **reloaded the page** — chip
   still showed "Wellness Basic · ₹499.00/mo" (real persistence,
   confirmed against a fresh server round trip, not client cache).
4. Opened the dialog again, clicked "No membership" to cancel — **reloaded
   the page** — chip reverted to "No membership" and stayed that way
   (real cancellation, not a client-side reset).

## Result

**Pass.** All 6 acceptance criteria in `REQ166` verified, including the
two that specifically distinguish this from the old mock (AC3/AC4:
survives a page reload).
