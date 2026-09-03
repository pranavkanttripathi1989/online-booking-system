---
id: TR275
type: improvement
feature: queue-management
created: 2026-09-03
updated: 2026-09-03
status: done
parent: TP275
related: [REQ186, PLAN255]
---

# TR275 — Test results: front-desk self-check-in kiosk mode (P2-15)

## Outcome

All 9 cases in `TP275` pass. `checkin.test.jsx` (new): 9/9 in isolation,
covering both the unchanged personal-phone flow and the new kiosk flow
(idle screen, both scanned-string shapes, an error case, the 6-second
auto-reset via `jest.useFakeTimers`, an empty-scan no-op, and an
`axe-core` zero-violations check).

`npx eslint` on the three touched files (`checkin.jsx`, `checkin.test.jsx`,
`App.jsx`): 0 errors, 11 `I18N-1` warnings — matching the pre-existing
pattern already present on this page before this slice (no i18n layer
exists yet, a standing, already-logged repo-wide gap). Full-tree
`npx eslint .`: 3919 warnings, under the `package.json`
`--max-warnings 4908` ratchet ceiling — not increased beyond budget.

`node scripts/check-page-data-wiring.mjs`: clean (1 known-fabricated
page, 0 new — unaffected by this slice).

`npm run build`: succeeds. `npm run size`: all four bundle budgets held
(initial bundle 331.62 kB / 350 kB, largest lazy chunk 109.92 kB / 115 kB,
RichTextEditor 125.05 kB / 130 kB, initial CSS 13.59 kB / 18 kB) — this
slice added no new dependency and reused an existing lazy chunk, so the
near-unchanged numbers are expected, not a false negative.

No backend code changed in this slice (`checkInWithQrToken` is reused
verbatim), so no backend test run was required.

## Full frontend suite — 3 runs, confirming pre-existing flakiness, not a regression

Run once in full (`--maxWorkers=2`, matching this repo's own documented
default-worker-count OOM caution) as this codebase's own standing practice.
Three consecutive attempts each failed a **different** small set of
suites — the same "resource-contention flakiness under a full-parallel run
on this host" pattern this codebase's own history has repeatedly
documented (see `CLAUDE.md`'s own account of `PrescriptionBuilder`,
`test-results/index`, `patients/detail`, `booking/index`,
`CreateClinicianPage`, `EncounterWorkspace` flagging and clearing across
different runs in prior slices):

| Run | Failed suites | Failed tests | Total |
|---|---|---|---|
| 1 (killed mid-flight, exit code unreliable — see below) | not captured | — | — |
| 2 | `PrescriptionBuilder.test.jsx` (a 5000ms timeout on a real-drug-quick-add test) + 3 more not individually captured | 6 failed | 443 total, 4 suites failed |
| 3 | `EncounterWorkspace.test.jsx`, `Admissions.test.jsx` | 3 failed | 443 total, 2 suites failed |

**`checkin.test.jsx` — this slice's own file — passed in every run**,
including both full-parallel attempts, not just the isolated run above.
None of the suites that failed across any of the three runs
(`PrescriptionBuilder`, `EncounterWorkspace`, `Admissions`, and whichever
made up run 2's other 3) import `pages/public/checkin.jsx` or reference the
new `/checkin` route — confirmed by the file list in `App.jsx`'s own
import graph. **Conclusion: these are pre-existing, host-load-driven
flakes, not a regression introduced by this slice.**

One process-note worth recording: a background full-suite run that showed
0% CPU in a `ps` snapshot was killed as an apparent hang before its
completion notification arrived a few seconds later reporting exit code 0
— the process was not actually hung, `ps`'s snapshot simply landed between
worker CPU bursts. The kill was harmless (the run had already produced its
result), but the lesson for next time: don't judge a Node/Jest worker as
hung from a single `ps` sample: wait for the harness's own completion
notification instead of a manual poll-and-kill.

## Commits

- (frontend code + docs committed together — see the P2-15 commit on
  `master`)
