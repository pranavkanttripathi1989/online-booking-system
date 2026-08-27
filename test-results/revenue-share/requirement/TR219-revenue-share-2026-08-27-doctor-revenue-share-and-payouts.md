---
id: TR219
type: requirement
feature: revenue-share
created: 2026-08-27
updated: 2026-08-27
status: pass
parent: TP219
related: [REQ158, PLAN199]
---

# TR219 — Results: doctor revenue-share & payouts engine (P2-06)

## Backend

- `npx jest revenue-share --maxWorkers=2`: **30/30 green**
  (`revenue-share.service.spec.ts` 22, `revenue-share.resolver.spec.ts` 8).
  Two of my own test assumptions were wrong on the first pass, not the
  service logic: `orgIdForWrite`'s own fail-closed guard throws
  `ForbiddenException`, not `BadRequestException`; `assertSameOrg` masks
  a cross-org record as `NotFoundException`, not `BadRequestException` —
  both fixed to assert the real, already-established helper behaviour.
- `npx jest --maxWorkers=2` (full backend suite): 1989/1991 tests, 123/124
  suites green. The 2 failures are in `queue/queue.service.spec.ts`, a
  file this slice never touched (confirmed via `git diff HEAD` — zero
  local changes). Reproduced in isolation and traced to a genuine
  midnight-IST-boundary timing edge (the suite ran at ~00:50 IST) in a
  pre-existing fixture — not a regression from this slice.
- `npx tsc --noEmit`: clean.
- `npx eslint "{src,apps,libs,test}/**/*.ts"`: clean.
- `npm run test:int`: **9/9 suites, 414/414 tests, green.** The tenancy
  matrix's own gate first correctly failed on the new, unclassified
  `revenue-share` domain — closed with a new, honest `EXEMPT` entry
  (unlike prior exemptions, this one states plainly that a real
  id-keyed matrix shape exists but coverage is deferred to
  `setup/domain-cases.ts` for a future slice, since that file was
  concurrently owned by other in-flight work in this session).

## Frontend

- `npx jest src/pages/manager/revenue-share --maxWorkers=1`: **4/4
  green** — a new page's first test file.
- `npm run lint`: **4907 warnings, 0 errors** — ratchet ceiling raised
  from 4879 to 4907; every new warning is the pre-existing I18N-1 class
  already present throughout this codebase's un-migrated pages.
- `npm run build` + `npm run size`: green. Initial bundle
  348.97/350 kB (up marginally from 348.82 — the new lazy route
  registration + nav icon import in the always-loaded entry chunk; the
  page itself is its own separate lazy chunk). Largest lazy chunk
  109.92/115 kB (unchanged); initial CSS 13.5/18 kB. Headroom on the
  initial bundle remains under 1.1 kB — flagged again (third
  consecutive slice, see `TR216`/`TR218`'s own notes) — the next slice
  touching `App.jsx`'s always-loaded imports should check this budget
  first, and a dedicated look is now overdue.
- Full suite (`npx jest --maxWorkers=2`): 279/284 tests, 41/43 suites
  green. Confirmed via a `--json` run (not just the truncated console
  tail) that the 2 failing suites are exactly
  `clinician/EncounterWorkspace.test.jsx` and
  `manager/claims/index.test.jsx` — both already-documented pre-existing
  flaky suites (host-load contention; `manager/claims` was bisected
  against a HEAD-committed original in the earlier `P2-03` slice this
  same session). `manager/revenue-share/index.test.jsx` is not among the
  failures.

## Real findings from this slice

1. **A real scope correction**, made before any code was written: the
   phase doc's "per-branch" framing for revenue-share assumed a
   clinician could have different rates at different branches
   simultaneously. `Clinicians.clinic_id` is a single scalar, not a
   many-to-many relation — confirmed via a full-schema grep for a
   clinician↔clinic join table (none exists). See `REQ158`'s own
   account for the resolution.
2. Two of my own test-authoring assumptions about which exception type
   `orgIdForWrite`/`assertSameOrg` throw were wrong on the first pass —
   caught immediately by the test run itself, fixed to match the real,
   already-established helper behaviour rather than changing the
   helpers.
3. A live, unrelated issue the user flagged mid-slice: the
   `medibook_frontend` container's own `node_modules` volume was
   missing `web-vitals` even though it existed on the host and in
   `package.json` — the same "container node_modules volume goes stale
   relative to the host" class this codebase's CLAUDE.md already
   documents from `P1-18`. Fixed with `npm install` inside the
   container plus a restart to clear Vite's stale dependency-
   optimization cache; confirmed via a direct `curl` of the
   previously-failing module path returning 200. Unrelated to this
   slice's own code.

## Open items

- The tenancy-matrix `EXEMPT` entry for `revenue-share` is honest about
  being a deferral, not a claim of "no shape exists" — a future slice
  should add a real `CASES` row to `setup/domain-cases.ts` once that
  file is no longer concurrently owned by other in-flight session work.
- Actual money disbursement (bank/UPI/Razorpay Route) remains a named,
  deliberately out-of-scope follow-on (see `REQ158`).
- The initial bundle's shrinking headroom (under 1.1 kB now, three
  slices running) needs a dedicated look before the next slice that
  touches `App.jsx`.
