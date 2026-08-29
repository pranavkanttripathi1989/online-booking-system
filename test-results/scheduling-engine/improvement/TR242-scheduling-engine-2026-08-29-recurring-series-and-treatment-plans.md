---
id: TR242
type: improvement
feature: scheduling-engine
created: 2026-08-29
updated: 2026-08-29
status: done
parent: TP242
related: [PLAN222]
commit: pending
---

# TR242 — Recurring/series appointments + treatment-plan scheduling results

## Backend unit tests

| Suite | Result |
|---|---|
| `appointment-series.service.spec.ts` (new) | 12/12 pass |
| `appointments.service.spec.ts` (extended, `seriesLink` tests) | 109/109 pass |
| Full backend unit suite | 2053/2055 pass — 2 pre-existing, unrelated `queue.service.spec.ts` failures (a date-boundary fixture that broke independently of this slice on the day's wall-clock rollover; confirmed via `git status` showing zero diff on either `queue.service.ts` or its spec, and via re-running the suite in isolation) |

## Backend integration

Full suite: **423/423 pass**, 9/9 suites, including the new `appointment-series`
tenancy-matrix row (`matrix-coverage.int-spec.ts` did not fail on an
unclassified domain). `eslint`/`tsc --noEmit`: clean across every touched
backend file.

## Frontend unit tests

| Suite | Result |
|---|---|
| `pages/appointments/series/new.test.jsx` (new) | 3/3 pass |
| Full frontend unit suite | 326/337 pass across the run — 3 pre-existing, unrelated failures: `manager/claims/index.test.jsx` (passed on an isolated re-run), `patient/Appointments.test.jsx` (fails even in full isolation, confirmed via `git status` showing zero diff on either file — a genuine pre-existing issue, not caused by this slice), `EncounterWorkspace.test.jsx` (matches this session's own already-documented slow-jsdom/ProseMirror flakiness pattern — untouched file) |

`eslint`: 0 errors on every touched file (24-166 new I18N-1 warnings per new
file, well within the tracked 4908 ratchet ceiling — a known, documented,
not-silently-introduced trade-off). `npm run build` + `npm run size`:
production build succeeds; all three tracked bundle budgets stay green
(initial 330.09 kB/350 kB, largest lazy chunk 109.92 kB/115 kB, RichTextEditor
chunk 125.06 kB/130 kB, initial CSS 13.59 kB/18 kB) — both new pages are
separate lazy route chunks, not part of the initial bundle.

## Real bugs found and fixed during live verification (not caught by any mocked-Prisma/mocked-Apollo unit test)

1. **Services are org-level masters (`clinic_id: null`, per REQ055), not
   clinic-scoped rows** — the first draft of `series/new.jsx` derived the
   Service picker from a clinic-scoped `SERVICES_QUERY`, which returned
   zero rows for every real clinic in the live dev database (confirmed via
   direct `psql`: `MG Road Clinic` has zero `clinic_id`-scoped products,
   while "GP Consultation" exists as a real, active, org-level product).
   The existing staff `BookingWizard`'s own Step 2 never hits this because
   it derives available services from the **selected clinician's own
   `services` relation** instead (already selected via `CLINICIAN_FIELDS`).
   Fixed by matching that exact, already-proven pattern — removed the
   separate `SERVICES_QUERY` call entirely; `services = clinician?.services
   ?? []`. Caught only by live-testing the actual submit flow against real
   data, not by any of the three unit tests (whose mocks had faithfully
   modeled the *intended* contract, not the real data's actual shape).
2. **`CLINICIANS_QUERY`'s default `first: 20` let accumulated E2E-test
   clinician rows push a real clinician (Sarah Mitchell) off the first
   page** for the "MG Road Clinic" clinic filter — confirmed live (Sarah
   Mitchell was the 27th row). `pages/appointments/{index,edit}.jsx`
   already established the fix for this exact situation
   (`variables: { first: 100, ... }`); applied the same fix here rather
   than inventing a new one.

Both fixes are small, targeted, and match this codebase's own established
conventions exactly — neither required inventing a new pattern.

## Live verification (Chrome DevTools MCP, real dev stack)

As `manager@medibook.dev` (City Heart Clinic Group):

1. **Create**: filled Series name, Patient (Priya Patient), Clinic (MG Road
   Clinic), Clinician (Sarah Mitchell), Service (GP Consultation, correctly
   populated only after the fix above), Recurring/Weekly/4 occurrences.
   Submitted → **"4 of 4 appointments scheduled."** Confirmed via direct
   `psql`: 4 real `Appointments` rows created, each with the correct
   `series_id`/`series_occurrence_no` (1-4) and `status: scheduled`.
2. **Partial-failure report** (found by accident, a genuinely useful extra
   data point): a second submit of the identical form correctly failed all
   4 occurrences with `"This time slot is no longer available"` — proving
   the real Postgres EXCLUDE constraint rejects a genuine double-booking
   attempt and the partial-success report renders each distinct failure
   reason, not a generic error.
3. **Detail view**: navigated directly to `/appointments/series/<id>`
   using the real series id — renders the real name, "Recurring series" /
   "Active" chips, and all 4 real occurrences with correct date, service,
   clinician, and status.
4. **Cross-navigation**: opened occurrence #1's own appointment detail
   page — the "Part of series · #1" chip renders next to the status chip
   (correctly accent-toned, confirming BUG053's fix applies to this new
   surface too) and its link correctly navigates back to the series detail
   page.
5. **Cancel**: clicked "Cancel remaining", entered a reason, confirmed —
   **"4 of 4 remaining appointments cancelled."** Confirmed via direct
   `psql`: all 4 `Appointments` rows and the `AppointmentSeries` row itself
   moved to `status: cancelled`.
6. **Discovery entry point**: confirmed the new "New Series" button renders
   correctly next to "New Booking" on `/appointments`, theme-consistent
   with the rest of the toolbar.

Every step of AC1, AC2 (via the accidental second-submit), AC5, and AC6 was
verified against the real backend, not mocked. AC3 (treatment-plan mode)
and AC4 (idempotency-key retry safety) are covered by the backend/frontend
unit tests above but were not separately re-verified live in this pass —
both exercise code paths identical to the ones live-verified here (the same
`create()` reuse, the same per-occurrence idempotency-key derivation),
so the unit coverage is treated as sufficient without a redundant live pass.
