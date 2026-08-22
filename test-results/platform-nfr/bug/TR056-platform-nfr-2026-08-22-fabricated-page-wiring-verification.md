---
id: TR056
type: bug
feature: platform-nfr
created: 2026-08-22
updated: 2026-08-23
status: pass
parent: TP057
related: [BUG009, PLAN030, F-18]
---

# TR056 — Results for wiring the seven fabricated pages

Executed 2026-08-22/23 on the host (Node v24.19.0) against the running stack and
`medibook_postgres_test`.

## Per-page contract

| Case | Result | Evidence |
|---|---|---|
| TC-01 no `MOCK_*` survives | **pass** | grep over all six wired pages returns nothing |
| TC-02 fields exist in the real schema | **pass** | `tsc --noEmit` clean, production build succeeds, `schema.gql` regenerated with the new `type` field |
| TC-03 analytics on real stats | **pass** | `getAppointmentStats` + `getClinics`; KPI deltas are the resolver's own prior-period trends |
| TC-04 staff/Appointments filters server-side | **pass** | `AppointmentFilters` (status, date_from, date_to, patient_name) sent as variables |
| TC-05 patient self-scoped | **pass** | page passes no patient id; the service narrows by `patient_id` from the JWT |
| TC-06 clinician self-scoped | **pass** | relation check (`appointments.some.clinician_id`) in the service |
| TC-07 landing works logged-out | **pass** | `getClinicians` is `@Public()`; no auth header sent |
| TC-08 staff/Dashboard on `dashboard` | **pass** | KPIs, queue and utilisation all from the query |
| TC-09 billing redirects | **pass** | `/manager/billing` → `<Navigate to="/finances" replace />`; `Billing.jsx` deleted (436 lines); duplicate nav entry removed |

## Empty, loading and error

| Case | Result | Notes |
|---|---|---|
| TC-10 empty state | **pass** | every page reads `data?.x ?? []` — no `|| MOCK` anywhere |
| TC-11 loading ≠ empty | **pass** | skeletons while in flight; "none found" only once settled |
| TC-12 error + Retry | **pass** | `Alert` with a `refetch()` action on all six |
| TC-13 filtered-empty ≠ no-data | **pass** | distinct copy in `staff/Appointments` and `clinician/Patients` |

## Defects found while wiring

| Case | Result | Detail |
|---|---|---|
| TC-14 `/staff/*` guard | **pass** | `RoleGuard roles={['admin','super_admin','staff','manager']}`, matching `dashboard`'s `@Auth` |
| TC-15 currency default | **pass** | GBP/`en-GB` → INR/`en-IN` |
| TC-16 `no_show` chip | **pass** | underscore key added; previously rendered the literal string `no_show` |
| TC-17 `Appointments.type` | **pass** | entity + `toGraphQL` + shared fragment; `schema.gql` confirms |

## Gate and regression

| Case | Result | Evidence |
|---|---|---|
| TC-18 allowlist shrinks | **pass** | 10 → **3** (`onboarding`, `tasks`, `waiting-room`) |
| TC-19 staleness check fires | **pass** | the gate independently reported all seven as "no longer fabricated" before the list was edited — the list did not simply get trimmed by hand |
| TC-20 lint ratchet lowered | **pass** | 197 → **177** warnings, 0 errors; ceiling updated in `package.json` and CI |
| TC-21 frontend build + tests | **pass** | build succeeded (4m 15s); 4/4 tests |
| TC-22 backend suites | **pass** | 650/650 unit, 120/120 integration; eslint and `tsc` clean |

TC-19 is the one that makes TC-18 meaningful. An allowlist can always be
shortened by deleting lines; the gate saying "these seven no longer look
fabricated" is independent evidence that the code changed, not the list.

## Caveats stated rather than buried

- **No live browser verification.** This is the real gap in this slice. Every
  page compiles, lints, builds and issues a schema-valid query, and the backend
  contracts are covered by the integration suite — but the six wired pages were
  **not driven in a browser against real data**. The Playwright and Chrome MCP
  tooling was unavailable in this session. Anyone picking this up should do a
  pass over the six routes before treating them as proven end to end.
- **No new e2e specs.** These pages have no Playwright coverage, and e2e is not
  in CI (F-27/F-28). A regression here would not be caught automatically.
- **`clinician/Patients` issues an N+1.** `appointments` is a `@ResolveField`, so
  one extra query per patient row. At 10 rows against the
  `Appointments(patient_id, appointment_date)` index (added in BUG005) that is
  fine; it would not be at a page size of 200. Noted in the file.
- **Sorting in `clinician/Patients` is page-local.** The backend exposes no sort
  argument. Sorting the current page only is stated in the code rather than
  presented as a full-dataset sort.
- **`staff/Dashboard` lost real functionality**, deliberately: the check-in
  button had no backend to write to. That is a visible reduction in what the
  page appears to do, and the right trade against a button that silently did
  nothing. Tracked as `open-questions.md` #11.
