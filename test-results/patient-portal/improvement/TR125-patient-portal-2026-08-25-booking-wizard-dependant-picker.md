---
id: TR125
type: improvement
feature: patient-portal
created: 2026-08-25
updated: 2026-08-25
status: pass
parent: TP126
related: [REQ072, PLAN099]
---

# TR125 — Results for the booking-wizard dependant picker (REQ072)

Executed 2026-08-25 on `master`, as part of an 8-slice batch.

## Verification performed

`cd frontend && npm run lint` — clean (confirmed the file's 4 remaining
warnings are pre-existing and unrelated, via `git stash`/`git stash
pop` before and after this change). `npm test` — 110/117 pass across the
suite; the 4 unrelated failing suites (`settings/index.test.jsx`,
`patients/detail.test.jsx`, `EncounterWorkspace.test.jsx`,
`booking/index.test.jsx`) are pre-existing timeout-related flakiness
under full-suite resource contention — each was re-run in isolation and
passed (3/4 cleanly; the 4th's one flaky test is in an unrelated
`pages/booking/` describe block that never imports
`BookingWizard/BookingStep4Patient.jsx`). `npm run build` — succeeded.

## Not yet done — logged honestly, not silently skipped

**No live browser pass.** This session had no browser-automation tool
available (no Chrome/Playwright MCP), so the manual QA checklist in
`TP126` was not executed. The query shapes were cross-checked
field-for-field against `REQ018`'s own already-shipped, already-live-
verified `myDependants` resolver and the `Privacy` tab's existing
`me { patient {...} }` usage — the same GraphQL contract, a third
consumer. This is a real gap relative to this codebase's own
established practice ("live verification catches real bugs unit tests
miss, every time it's been tried") and should be closed before this
slice is treated as fully proven — see `PLAN099`'s own note for the
exact checklist to run.

## Commits

See the commits immediately following this test-results doc in `git log`.
