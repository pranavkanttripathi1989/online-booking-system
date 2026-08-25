---
id: TR109
type: bug
feature: clinician-dashboard
created: 2026-08-25
updated: 2026-08-25
status: pass
parent: TP110
related: [BUG021, PLAN083]
---

# TR109 — Results for the clinician dashboard rebuild (BUG021)

Executed 2026-08-25 against `medibook_backend`/`medibook_frontend` (the
shared dev stack) on `master`.

## Backend

| Case | Result | Evidence |
|---|---|---|
| `createSpacerBlock`: clinician creates a block for their own `clinician_id` | **pass** | `blocks.service.spec.ts` — new case, `success: true` |
| `createSpacerBlock`: clinician attempts a block for a DIFFERENT `clinician_id` | **pass** | new case — `success: false`, `spacerBlocks.create` never called |
| Pre-existing manager/admin/org-scoping create-path tests | **pass, unchanged** | 15/15 in `blocks.service.spec.ts`, 0 regressions |
| Full backend unit suite | **pass** | 80 suites / 1217 tests (up from 1215) |
| Full backend integration suite | **pass** | 4 suites / 369 tests, unchanged |
| `eslint` (`{src,apps,libs,test}/**/*.ts`) | **pass** | clean |
| `tsc --noEmit` | **pass** | clean |

## Frontend unit — `Dashboard.test.jsx` (new)

| Case | Result |
|---|---|
| Real appointment data renders; literal mock names (`Emma Wilson` etc.) never appear; no "Offline" banner | **pass** |
| `me.clinician: null` renders the real "not linked" state, not fabricated data | **pass** |
| A genuine query error renders a real error state with a working Retry | **pass** |
| A genuine empty day renders "No more appointments today", not mock appointments | **pass** |
| A `confirmed` (not just `scheduled`) appointment counts as upcoming | **pass** |

Full frontend suite: 87 tests / 11 suites, 86 passing. The one failure
(`booking/index.test.jsx`, unrelated to this change — a pre-existing
full-suite-contention flake) passes cleanly 7/7 in isolation, confirmed
twice. `eslint`: 0 errors, 162 warnings (ratchet held — down from 163
before this fix, since two pre-existing unused-import warnings on
`Dashboard.jsx` were also cleaned up in passing). `npm run build`: clean.
`scripts/check-page-data-wiring.mjs`: 0 new fabricated pages.

## e2e — `clinician-dashboard.spec.js` (new), against the real backend

| Case | Result |
|---|---|
| Dashboard shows real today's appointment data, never the fabricated mock schedule | **pass** |
| "Add Block" saves a real, persisted spacer block (survives a page reload) | **pass** |
| "Mark Complete" persists the real appointment status (survives a page reload) | **pass** |

3/3, confirmed on two full consecutive runs (one transient `loginAs`
timeout on an intermediate run traced to host/dev-server load, not a code
defect — retried clean immediately after with both `curl` health checks
green).

## Two real issues hit and fixed during this verification, worth recording

1. **`createSpacerBlock`'s pre-existing `@Auth` gate excluded `'clinician'`
   entirely** (`manager`/`admin`/`super_admin` only) — found while writing
   `PLAN083`, before any test ran: the sibling read query
   (`getSpacerBlocks`) had already been widened for this exact caller, but
   the write path never was. Without this fix, the rebuilt page's "Save
   Block" action would 403 for every real clinician, unconditionally.
   Fixed with a widened `@Auth` plus a service-level self-scope check
   (mirrors `getSpacerBlocks`'s own pattern) — covered by the two new
   backend unit cases above.
2. **A genuine UTC/IST day-boundary bug in this e2e spec's own fixture
   creation** (not a page defect) — a fixed local-clock hour
   (`Date#setHours`) converted to UTC can land on the *previous* UTC
   calendar day for an early-IST-morning hour, since this host is
   UTC+5:30. The fixture's `start_datetime` then missed the backend's
   UTC-bounded `date_from`/`date_to` "today" filter and, on a later
   iteration, collided with its own earlier run's still-scheduled
   appointment on that other day (`"This time slot is no longer
   available"`) instead of failing loudly. This is the same class of gap
   already logged as `context/open-questions.md` #15 for the isolated e2e
   stack's containers, now confirmed to also bite a plain Node
   `Date#setHours` call on the host itself, not just a container's
   missing `TZ`. Fixed by anchoring the fixture to `Date.now()` minus a
   few hours (unambiguous — both UTC and local "today" agree on it
   whenever the run happens comfortably after local midnight) instead of
   a fixed local clock hour, and by having the spec's own `beforeAll`
   cancel any leftover *scheduled* same-named fixture before creating a
   fresh one.

## Live end-to-end proof (not just separate unit-level claims)

The e2e run's `beforeAll` fired a real `createAppointment`, which the
backend logs confirm triggered the real `NotificationTriggerService`
pipeline (`[notification] EMAIL stub — would send "New appointment
booked"...`) — the same real write path a genuine booking takes. The
"Mark Complete" test then confirmed, after a full page reload (not just
reading updated in-memory React state), that the real `completeAppointment`
mutation had durably changed the row's status — the exact guarantee
`BUG021`'s defect #3 was missing.

## Commits

See the commits immediately following this test-results doc in `git log`.
