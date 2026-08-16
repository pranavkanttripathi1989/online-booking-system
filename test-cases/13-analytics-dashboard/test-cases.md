# Analytics & Dashboard — Test Cases

**Domain covers:** per-role dashboard KPI aggregation (`/dashboard` admin, `/manager/dashboard`, `/clinician/dashboard`, `/patient/dashboard`, `/staff` staff), plus revenue/utilisation reporting (`/analytics`, `/finances`).
**Grounded in:** `test-plan/dashboard-test-plan.md` + `-done.md`, `test-plan/manager/manager-dashboard-test-plan.md` + `test-plan/16-03-2026-not-done/manager-dashboard-test-plan-done.md`, `test-plan/analytics-finances-test-plan.md`, `test-plan/patient-dashboard-test-plan.md` + `test-plan/patient-portal/patient-dashboard-test-plan-done.md`, `test-plan/staff-dashboard-test-plan.md` + `test-plan/staff/staff-dashboard-test-plan-done.md`, `test-plan/clinician-portal/clinician-dashboard-test-plan-done.md`, their `test-result/` and `test-suggestion/` counterparts, `context/frontend-contract-analysis.md` §2 (`DASHBOARD` query), `frontend/src/graphql/queries.js`, and direct inspection of each dashboard page's source.
**Key contract fact driving many of these cases:** the root `DASHBOARD_QUERY` (the documented hard contract) returns `bookings_by_service: [{service_name, count}]` and `utilisation_by_clinician: [{clinician:{full_name,...}, slots_available, slots_booked, utilisation_percent}]` — but the Admin Dashboard's own `MOCK_DASHBOARD` fallback (what actually renders whenever the backend is offline, i.e. today, always, given the 2-second Apollo timeout) uses `{name, value}` and `{name, booked, available}` shapes instead. A real backend returning the contractually-correct shape will render **broken/blank charts** against the current component code unless this is fixed — this is the single most important integration risk in this domain and is exercised directly below.
**Also note:** each dashboard variant (Admin/Manager/Clinician/Patient) defines its own colocated GraphQL query independently of `DASHBOARD_QUERY` (`GetManagerDashboardData`, `GetClinicianDashboardData`, `GetPatientDashboardData`), each with its own field-naming convention (snake_case vs camelCase) — the Staff Dashboard has no GraphQL query at all, 100% local mock state.

---

## 1. Unit Test Cases

### TC-ANLY-UNIT-001 — Confirmation-rate calculation handles zero total gracefully
- **Priority:** High
- **Steps:** Call the confirmation-rate calculator with `volume_by_day` where every day has `confirmed_count: 0, cancelled_count: 0` (i.e. `totalAll === 0`).
- **Expected Result:** Returns `null` (not `NaN`, not `0`) — the Admin Dashboard's confirmation-rate insight strip must hide entirely rather than render "NaN%" or a misleading "0%".

### TC-ANLY-UNIT-002 — Confirmation-rate color tiering boundaries
- **Priority:** Medium
- **Steps:** Compute the tier for confirmation rates of exactly `75`, `74.9`, `50`, `49.9`.
- **Expected Result:** `75` and above → green tier; `50`–`74.9` → amber tier; below `50` → red tier — verifies the `>=75` / `50-74` / `<50` boundaries are applied with correct inclusive/exclusive edges, not off-by-one.

### TC-ANLY-UNIT-003 — Utilisation percentage is computed from booked/available, not trusted as a raw field
- **Priority:** Critical
- **Steps:** Given `slots_booked: 24, slots_available: 32`, compute `utilisation_percent`.
- **Expected Result:** Returns `75` (rounded, not truncated, from `24/32 * 100`) — this is the calculation the backend's `utilisation_by_clinician.utilisation_percent` field must reproduce exactly, since the frontend today computes this client-side from `booked`/`available` in its mock fallback rather than trusting a server-sent percent.

### TC-ANLY-UNIT-004 — Utilisation-bar color tier is consistent across all pages that show it
- **Priority:** Medium
- **Preconditions:** Grounded in a confirmed real inconsistency: the Staff Dashboard's `getBarColor` uses `>0.85` red / `>0.70` amber / else teal, while the Analytics page's Clinician Utilization bars use `>=80%` green / `>=60%` amber / else red — two different threshold schemes for conceptually the same metric.
- **Steps:** Define a single canonical `utilisationColorTier(percent)` function and evaluate it at `59, 60, 69, 70, 79, 80, 85, 86`.
- **Expected Result:** One documented, single set of boundaries is produced and must be adopted by both pages — this unit test exists specifically to force the two pages onto one shared implementation rather than two divergent inline ones.

### TC-ANLY-UNIT-005 — Clinic-capacity bar color uses strict greater-than at its boundaries
- **Priority:** Medium
- **Preconditions:** Staff Dashboard's `getBarColor(ratio)`: `ratio > 0.85` → red, `ratio > 0.70` → amber, else teal (strictly `>`, not `>=`).
- **Steps:** Evaluate at exactly `0.70` and exactly `0.85`.
- **Expected Result:** `0.70` → teal (not amber); `0.85` → amber (not red) — the exact boundary values fall into the *lower* tier, confirmed by the strict-inequality implementation.

### TC-ANLY-UNIT-006 — KPI trend-of-zero renders as neutral, not as a false positive/negative
- **Priority:** Medium
- **Steps:** Compute the display treatment for a KPI whose `total_clinicians_change` is exactly `0`.
- **Expected Result:** Rendered as a neutral/gray indicator, distinct from both the green "up" and red "down" treatments — guards against `0 ?? null` type coercion bugs where a legitimate `0` trend could be mistaken for "no trend data" (null) or a falsy-negative.

### TC-ANLY-UNIT-007 — KPI fallback-to-mock logic never conflates a live zero with "no data"
- **Priority:** Critical
- **Preconditions:** Grounded in the Clinician Dashboard's real `value={x.length || fallback}` pattern (`Total Today`/`Completed`/`Remaining`/`Video Calls` cards), which uses JS's falsy-`0` behavior.
- **Steps:** Compute the displayed KPI value when a live backend returns an actually-empty appointments array (`length === 0`) versus when the query has not resolved at all (`undefined`/`null`).
- **Expected Result:** A real, live zero must display `"0"`; only the undefined/not-yet-loaded case should show the hardcoded fallback (12/5/7/3). The current `x.length || fallback` implementation cannot distinguish these two cases — this unit test specifies the corrected logic (e.g. `x?.length ?? fallback`, gated additionally on a `loading`/`hasData` flag) that must replace it.

### TC-ANLY-UNIT-008 — Patient dashboard KPI fallback applies per-field, not as one all-or-nothing object
- **Priority:** High
- **Preconditions:** Grounded in the real pattern `kpis = data?.getPatientKpis || {...MOCK_KPIS, upcoming: upcomingAppointments.length}` — `total`/`completed`/`cancelled` fall back to hardcoded mock numbers while `upcoming` is independently overridden from the live/mock appointment list length.
- **Steps:** Simulate `getPatientKpis` returning `null` while `getPatientAppointments` returns 4 scheduled rows.
- **Expected Result:** `upcoming` displays `4` (from the appointments list), while `total`/`completed`/`cancelled` display the mock fallback values (`12`/`9`/`1`) — verifies this specific partial-fallback shape is implemented exactly, since a naive "fallback the whole object" implementation would show `upcoming: 2` (the stale mock value) instead of the correct live-derived `4`.

### TC-ANLY-UNIT-009 — Manager dashboard custom date-range validation rejects Start > End
- **Priority:** High
- **Steps:** Compute `dateRangeError` for `customStart = 2026-03-20`, `customEnd = 2026-03-10`.
- **Expected Result:** Returns the string `"Start date cannot be after End date."` — and for `customStart = customEnd` (same day), returns `null` (a single-day range is valid, not an error).

### TC-ANLY-UNIT-010 — Manager dashboard query is skipped, not sent, while a date-range error is active
- **Priority:** High
- **Steps:** With `dateRangeError` set (per TC-ANLY-UNIT-009), evaluate the resulting Apollo `skip` condition.
- **Expected Result:** `skip` evaluates to `true` (`skip: !user || !!dateRangeError`) — confirms the implemented fix is "suppress the query," not "auto-swap start/end dates" (an alternative approach that was considered but not the one implemented, per `manager-dashboard-test-results.md` TC-MGR-DASH-05).

### TC-ANLY-UNIT-011 — Appointment-volume weekly slicing responds to the selected date range
- **Priority:** Medium
- **Preconditions:** Grounded in a real fixed bug (`BUG-NEW-AF-002`): weekly mode used to always show a static 7-day array regardless of the selected date-range filter.
- **Steps:** Given a 21-day `ALL_WEEKLY_APPTS` array and `DATE_RANGE_WEEKS` map (`last1month: 7, last3months: 14, last7months: 21`), compute the sliced array for `last3months`.
- **Expected Result:** Returns exactly the most recent 14 days (`.slice(-14)`) — not a fixed 7, confirming the regression fix's slicing logic is correct for all three range options, not just the default.

### TC-ANLY-UNIT-012 — Compare-mode percentage-change calculation
- **Priority:** Medium
- **Steps:** Compute the compare badge for a KPI with current-period value `1167` and prior-period value `1038`.
- **Expected Result:** Returns `+12.4%` (rounded to 1 decimal) with the exact prior value `1038` retained for display — matches the exact figures confirmed in `test-result/dashboard-test-results.md` for the Analytics page's Compare mode.

### TC-ANLY-UNIT-013 — Currency formatting is INR-paise-aware, not a hardcoded symbol
- **Priority:** Critical
- **Preconditions:** Grounded in a systemic real finding: Admin Dashboard hardcodes `$`, Manager Dashboard hardcodes `£`, Analytics/Finances hardcode `$`, and Patient Dashboard notification copy hardcodes `£85` — none use ₹, despite `PaymentTransactions.amount` being an `Int` stored in paise with `currency` defaulting to `"INR"`.
- **Steps:** Call the canonical currency formatter with `amount: 2875000` (paise) and `currency: "INR"`.
- **Expected Result:** Returns `"₹28,750.00"` — this unit test specifies the single formatter every dashboard/KPI must be migrated to use, replacing the five independent hardcoded-symbol implementations found across Admin/Manager/Analytics/Finances/Patient pages.

---

## 2. Backend/API Test Cases

*Run against a real Postgres test database + the actual GraphQL schema, not mocks.*

### TC-ANLY-API-001 — `dashboard` query returns the exact contract field names for `bookings_by_service`
- **Priority:** Critical
- **Steps:** Seed appointment data across 3 services, call `dashboard { bookings_by_service { service_name count } }`.
- **Expected Result:** Response uses `service_name`/`count` exactly as documented in `frontend/src/graphql/queries.js` — this is the field shape that must NOT regress to the `{name, value}` shape the Admin Dashboard's own mock fallback mistakenly uses, or the pie chart will render blank/broken against a contractually-correct backend.

### TC-ANLY-API-002 — `dashboard` query returns the exact contract shape for `utilisation_by_clinician`
- **Priority:** Critical
- **Steps:** Seed a clinician with 32 available slots and 24 booked, call `dashboard { utilisation_by_clinician { clinician { id full_name avatar_url clinician_type { name } } slots_available slots_booked utilisation_percent } }`.
- **Expected Result:** Response nests clinician data under `clinician { full_name ... }` and includes `slots_available`/`slots_booked`/`utilisation_percent` exactly — not the flat `{name, booked, available}` shape the current mock fallback uses. This is the direct API-level counterpart to TC-ANLY-UNIT-003/004 and the most concrete "will break on real integration" risk identified in this domain.

### TC-ANLY-API-003 — `dashboard.no_show_rate` is computed from confirmed appointment outcomes only
- **Priority:** High
- **Preconditions:** 20 appointments today: 15 completed, 3 cancelled (by patient, in advance), 2 marked no-show.
- **Expected Result:** `no_show_rate` reflects `2 / 20` (or `2 / (completed+no_show)` — the exact denominator must be documented and tested), and explicitly excludes advance-cancelled appointments from the no-show numerator, since "cancelled" and "no-show" are semantically distinct outcomes that the current frontend's inconsistent status vocabularies (see TC-ANLY-API-005) risk conflating.

### TC-ANLY-API-004 — `GetManagerDashboardData.getAppointmentStats` scopes to the requested `clinicId`
- **Priority:** Critical
- **Preconditions:** Manager oversees 2 clinics within their organization.
- **Steps:** Call `getAppointmentStats(clinicId: clinicA.id, ...)`.
- **Expected Result:** Returned `totalAppointments`/`revenue`/etc. reflect Clinic A only — Clinic B's appointments never leak in, and omitting `clinicId` entirely returns the combined total across all clinics the manager is authorized for (never other managers'/orgs' clinics).

### TC-ANLY-API-005 — Appointment status values are a canonical enum across all dashboard-facing queries
- **Priority:** Critical
- **Preconditions:** Grounded in a real schema gap: `Appointments.status` is a plain `String @default("scheduled")` with no enum, and mock data across dashboards uses at least 4 different vocabularies (`confirmed/pending`, `scheduled/completed/cancelled`, Title-Case `Scheduled/Completed/Cancelled/No-Show`, and payment-side `succeeded/pending/failed`/`paid/pending/overdue`).
- **Steps:** Query `dashboard.upcoming_appointments[].status`, `getAppointmentStats.statusDistribution[].name`, and `getPatientAppointments[].status` for the same underlying seeded appointment.
- **Expected Result:** All three return the identical canonical status string for that appointment (e.g. always `"scheduled"`) — no page-specific casing/vocabulary translation is needed client-side. This test should fail today if run conceptually against the current mixed mock vocabularies, and passes only once a single enum is enforced.

### TC-ANLY-API-006 — `getPatientDashboardData` never returns another patient's appointments
- **Priority:** Critical
- **Steps:** Log in as Patient A, call `getPatientAppointments(patientId: PatientB.id, status: "scheduled")` (tampering with the argument to point at a different patient).
- **Expected Result:** Rejected or returns Patient A's own data only — `patientId` must be derived from the authenticated session, not trusted as a client-supplied argument, matching TC-AUTH-API-008's row-level scoping principle applied to this specific query.

### TC-ANLY-API-007 — `getPatientKpis` and `getPatientAppointments` agree on upcoming count
- **Priority:** High
- **Preconditions:** Grounded in a real potential source-of-truth mismatch: `getPatientKpis` and `getPatientAppointments` are two independent resolvers that could disagree.
- **Steps:** Seed a patient with exactly 3 appointments where `status = 'scheduled'` and a start time in the future. Call both `getPatientKpis(patientId).upcoming` and `getPatientAppointments(patientId, status: "scheduled").length`.
- **Expected Result:** Both return `3` — if they diverge, the dashboard's per-field fallback logic (TC-ANLY-UNIT-008) would inconsistently reconcile them; this test enforces the two resolvers share one source computation rather than independently-drifting logic.

### TC-ANLY-API-008 — `dashboard` query is rejected without authentication and scoped by tenant when authenticated
- **Priority:** Critical
- **Steps:** Call `dashboard` with no `Authorization` header; then as a manager of Org 1.
- **Expected Result:** First call rejected `UNAUTHENTICATED`. Second call's KPI figures (appointment counts, revenue) reflect only Org 1's data — no cross-tenant aggregation leak, consistent with TC-AUTH-API-010.

### TC-ANLY-API-009 — Revenue figures are returned in paise (Int), never as floating-point rupees
- **Priority:** Critical
- **Steps:** Seed ₹28,750.00 of monthly revenue, call `dashboard.total_revenue_month`.
- **Expected Result:** Returns the integer `2875000` (paise) — not `28750` or `28750.00` — matching CLAUDE.md's mandate that money is stored/transmitted as paise, never float rupees. The frontend's currency formatter (TC-ANLY-UNIT-013) is responsible for the paise-to-₹ display conversion, not the API.

### TC-ANLY-API-010 — Analytics CSV export reflects the currently-selected date range and filters
- **Priority:** Medium
- **Steps:** Select "Last 3 Months" range on the Analytics page, trigger Export CSV, inspect the downloaded file's row count/date span.
- **Expected Result:** The exported rows cover exactly the selected 3-month window — not the full dataset or a different default range — matching the filename pattern convention already observed (`analytics_{rangeSlug}_{ISOdate}.csv`).

### TC-ANLY-API-011 — `getTransactionsByDate` never returns a transaction with a null `appointment.patient`
- **Priority:** High
- **Preconditions:** Grounded in a real latent frontend crash risk: `trx.appointment?.patient.firstName` guards `appointment` but not `patient`, flagged in `test-suggestion` as unresolved (SUG-DASH-PLAN-007).
- **Steps:** Seed a transaction whose linked appointment exists but whose linked patient record has been hard-deleted (orphaned FK) or is null.
- **Expected Result:** Either the resolver excludes such rows, or it returns `patient: null` explicitly with the frontend contract requiring optional-chaining all the way through (`appointment?.patient?.firstName`) — this test exists to force the frontend fix to be verified against a real API response shape that can actually produce the crash-triggering condition, not just a Playwright mock.

### TC-ANLY-API-012 — `dashboard.volume_by_day` returns a stable, non-randomized series for a given date range
- **Priority:** Medium
- **Preconditions:** Grounded in a real mock-mode quirk: the Admin Dashboard's `MOCK_DASHBOARD.volume_by_day` re-randomizes via `Math.random()` on every remount, meaning KPI totals are session-stable but the underlying daily chart values are not.
- **Steps:** Call `dashboard(startDate, endDate)` twice with identical arguments a few seconds apart.
- **Expected Result:** Both calls return byte-identical `volume_by_day` arrays — real backend data must be deterministic for a fixed historical range, unlike today's mock, which is the acceptance bar distinguishing "looks like it works" mock behavior from a real, trustworthy reporting backend.

### TC-ANLY-API-013 — Row-level access: a clinician's dashboard-scoped queries never include another clinician's appointments
- **Priority:** Critical
- **Steps:** Log in as Clinician C1, call `getAppointments(clinicianId: C2.id, date: today)` (tampering with the argument).
- **Expected Result:** Rejected or scoped back to C1's own data only, regardless of the `clinicianId` argument supplied — mirrors TC-ANLY-API-006 for the clinician-side dashboard query.

---

## 3. Functional / E2E Test Cases

*Full frontend + backend journeys, run via Playwright against a running backend (not mocks).*

### TC-ANLY-E2E-001 — Admin Dashboard renders correctly against a real, contract-shaped backend response
- **Priority:** Critical
- **Preconditions:** Backend implements `DASHBOARD_QUERY` exactly per `frontend/src/graphql/queries.js` (the documented contract), including the `service_name`/`count` and nested `clinician{full_name}`/`slots_booked`/`slots_available`/`utilisation_percent` shapes.
- **Steps:** Log in as admin, load `/dashboard` with a real backend running (no Apollo timeout fallback triggered).
- **Expected Result:** The Service Breakdown pie chart and Utilisation-by-clinician bar chart both render real labeled data (clinician names, service names, percentages) — NOT blank/"Unknown"/0% — proving the frontend component code has been updated to consume the real contract shape rather than only the mock's divergent shape (directly closes the risk identified at the top of this file and in TC-ANLY-API-001/002).

### TC-ANLY-E2E-002 — Manager Dashboard date-range and clinic filters recompute all widgets together
- **Priority:** High
- **Steps:** As manager, select a specific clinic from the dropdown and a custom 30-day date range, observe all 5 KPI cards, both charts, and the transactions table.
- **Expected Result:** Every widget reflects the same clinic + date-range scope consistently — no widget silently retains stale/unfiltered data from before the filter change.

### TC-ANLY-E2E-003 — Manager Dashboard blocks an inverted custom date range end-to-end
- **Priority:** High
- **Steps:** As manager, set a custom Start date after the End date.
- **Expected Result:** A red alert appears ("Start date cannot be after End date."), the underlying query is not sent (verify via network inspection — no request fires), and correcting the End date to be after Start automatically clears the alert and resumes live data — matches the exact skip+alert behavior (not an auto-swap) confirmed as the implemented fix.

### TC-ANLY-E2E-004 — Clinician Dashboard's zero-appointment day shows 0, not a fallback number
- **Priority:** Critical
- **Preconditions:** Directly targets the real `x.length || fallback` bug: seed a clinician with genuinely zero appointments for today via a real backend.
- **Steps:** Log in as that clinician, load `/clinician/dashboard`.
- **Expected Result:** "Total Today" KPI shows `0`, not the hardcoded fallback `12` — this test should FAIL against the current unfixed component logic and passes only once TC-ANLY-UNIT-007's corrected logic is shipped.

### TC-ANLY-E2E-005 — Clinician Dashboard timeline reflects a real "Mark Complete" action reactively
- **Priority:** High
- **Steps:** As clinician, open an appointment detail drawer for a `scheduled` appointment, click "Mark Complete".
- **Expected Result:** The KPI cards (Completed count increments, Remaining decrements), the progress bar, and the timeline block's color all update immediately and consistently, without a manual page reload — verifies the reactive re-derivation pattern holds against a real mutation round trip, not just local `localStatusOverrides` state.

### TC-ANLY-E2E-006 — Patient Dashboard cancel action is a real mutation, not just a local optimistic hide
- **Priority:** Critical
- **Preconditions:** Grounded in the current mock-mode behavior: cancelling adds the id to a local `cancelledIds` Set with no actual mutation call.
- **Steps:** As patient, cancel an upcoming appointment via the dashboard's Cancel dialog. Reload the page. Log in as the clinician who owned that appointment and check their calendar.
- **Expected Result:** The appointment shows as cancelled after reload (not just hidden client-side for the session) AND the clinician's calendar reflects the cancellation — proves the optimistic UI is now backed by a real persisted state change.

### TC-ANLY-E2E-007 — Staff Dashboard check-in state and KPIs persist across reload once backend-wired
- **Priority:** High
- **Preconditions:** Grounded in a real, currently-open gap (SUG-STFDS-009, still pending): the Staff Dashboard has zero backend wiring today and resets its 3-patient queue to the initial hardcoded state on every reload.
- **Steps:** As staff, check in a patient from the queue. Reload the page.
- **Expected Result:** The patient remains checked-in after reload, and "Checked In" KPI count is unchanged by the reload — this test currently fails against the unwired mock-only implementation and is the acceptance bar for wiring the Staff Dashboard to the backend for the first time.

### TC-ANLY-E2E-008 — Analytics page's date-range selection is remembered across navigation to Finances
- **Priority:** Medium
- **Preconditions:** Grounded in an implemented feature (`SUG-AF-008`): `localStorage['medibook_dateRange']` is written by Analytics and read by the Finances Revenue Chart tab.
- **Steps:** On `/analytics`, select "Last 3 Months". Navigate to `/finances`, open the Revenue Chart tab.
- **Expected Result:** The Revenue Chart tab defaults to "Last 3 Months" (not its own independent default) — verifies the cross-page sync survives a real navigation, not just a component-level test.

### TC-ANLY-E2E-009 — Compare mode shows a period-over-period figure consistent with the underlying data
- **Priority:** Medium
- **Steps:** On `/analytics`, enable "Compare" mode for a KPI with a known prior-period value seeded in the backend.
- **Expected Result:** The badge's stated percentage change and "Prior: {value}" figure are arithmetically consistent with the actual current vs. prior period totals returned by the backend — not merely a plausible-looking static mock number.

### TC-ANLY-E2E-010 — Currency displays ₹ (INR) consistently across every dashboard and analytics page
- **Priority:** Critical
- **Preconditions:** Directly targets the systemic finding that Admin uses $, Manager uses £, Analytics/Finances use $, and Patient notification copy uses £ — none use ₹ despite the India-market/paise mandate.
- **Steps:** Visit `/dashboard`, `/manager/dashboard`, `/analytics`, `/finances`, and `/patient/dashboard` in turn as the appropriate roles, with a real backend returning paise amounts.
- **Expected Result:** Every currency figure on every page renders with the ₹ symbol and correct paise-to-rupee conversion — zero instances of `$` or `£` remain anywhere in this domain's UI.

### TC-ANLY-E2E-011 — Appointment status is displayed identically across roles for the same appointment
- **Priority:** High
- **Steps:** Create one appointment, then view its status as it appears on the Admin Dashboard's upcoming list, the Manager Dashboard's status distribution donut, and the Patient Dashboard's appointment card, for the same appointment.
- **Expected Result:** All three show the same canonical status label/casing (e.g. consistently "Scheduled", never a mix of `scheduled`/`confirmed`/`Scheduled`) — end-to-end proof that TC-ANLY-API-005's canonical enum requirement was actually adopted by every page's rendering layer, not just the API.

### TC-ANLY-E2E-012 — Empty-state rendering across all 5 dashboards for a brand-new organization with zero data
- **Priority:** Medium
- **Steps:** Provision a brand-new organization with zero clinicians, patients, and appointments. Log in with a user of each role and view their respective dashboard.
- **Expected Result:** Every chart/KPI/table shows an explicit, non-crashing empty state ("No data available for this period", "No appointments today", etc.) — none renders a raw `NaN`, `undefined`, a broken chart axis, or a client-side exception.

---

## 4. Frontend Test Cases

*Component/page-level, run against the existing mock store — these should pass (or, where noted, are current known gaps) today, independent of backend readiness.*

### TC-ANLY-FE-001 — Admin Dashboard mock contract shapes diverge from the documented `DASHBOARD_QUERY`
- **Priority:** Critical
- **Preconditions:** `frontend/src/pages/dashboard/index.jsx`'s `MOCK_DASHBOARD` uses `bookings_by_service: [{name, value}]` and `utilisation_by_clinician: [{name, booked, available}]`, diverging from the contract's `{service_name, count}` and `{clinician:{full_name,...}, slots_available, slots_booked, utilisation_percent}`.
- **Steps:** Inspect the shape of the data actually consumed by `ServicePieChart` and the utilisation chart in the current mock-mode render.
- **Expected Result (current behavior, flag as a gap):** Charts render correctly against the mock's own shape today — but this is only because the mock and the consuming component were built to match each other, not the documented contract. This test's purpose is to make the divergence explicit and trackable ahead of backend integration (see TC-ANLY-E2E-001 for the real-backend acceptance version).

### TC-ANLY-FE-002 — Admin Dashboard "Last Refreshed" chip never updates after mount
- **Priority:** Low
- **Preconditions:** The chip's time value is computed via `useMemo(() => ..., [])` with an empty dependency array — it captures mount time once and never recomputes, and there is no polling/refresh timer on this page at all (unlike the Clinician Dashboard's 60-second auto-refresh).
- **Steps:** Load `/dashboard`, wait several minutes without reloading, observe the "Refreshed HH:MM" chip.
- **Expected Result (current behavior):** The chip's displayed time stays frozen at the original mount time indefinitely — flag as a gap if live-refresh is later expected here to match the Clinician Dashboard's pattern.

### TC-ANLY-FE-003 — Chart-range toggle (7D/14D/30D) actually changes the rendered chart data
- **Priority:** High
- **Preconditions:** Grounded in a fixed regression, `BUG-DASH-001`: this toggle previously had no effect on the chart.
- **Steps:** On `/dashboard`, switch between 7D/14D/30D chart-range options.
- **Expected Result:** The Appointment Volume chart's x-axis range and plotted points visibly change with each selection — this is a regression test for the confirmed-fixed bug, not a new-feature test.

### TC-ANLY-FE-004 — Utilisation chart on narrow mobile viewport uses horizontal scroll, not a 4-bar slice
- **Priority:** Medium
- **Preconditions:** An earlier test-plan draft expected mobile (≤375px) to slice the utilisation chart to 4 bars; the actual shipped fix (`NEW-DASH-012`) instead uses horizontal scroll with `minWidth: chartData.length * 52`px per bar.
- **Steps:** Render `/dashboard` at a 375px viewport width with 6+ clinicians in the utilisation dataset.
- **Expected Result:** All 6+ bars are present in the DOM and reachable via horizontal scroll — none are dropped/sliced off. A test asserting "only 4 bars visible" would incorrectly fail against the actual shipped behavior; this test documents the correct current expectation.

### TC-ANLY-FE-005 — Manager Dashboard's optional chaining gap on transaction patient data
- **Priority:** High
- **Preconditions:** Grounded in a real, still-unresolved latent bug flagged in `test-suggestion` (SUG-DASH-PLAN-007): the render code has `trx.appointment?.patient.firstName` — guards `appointment` but not `patient`.
- **Steps:** Render the Recent Transactions table with a mock transaction where `appointment` is a non-null object but `appointment.patient` is `null`.
- **Expected Result (current behavior, should FAIL until fixed):** The render currently throws (`Cannot read properties of null (reading 'firstName')`) rather than gracefully falling back — this test is the concrete reproduction case for closing SUG-DASH-PLAN-007 with the full chain `appointment?.patient?.firstName`.

### TC-ANLY-FE-006 — Manager Dashboard's "lower is better" cancellation-rate trend renders with inverted color semantics
- **Priority:** Medium
- **Preconditions:** The Cancellation Rate KPI's trend of `-2` (an improvement, since a decreasing cancellation rate is good) uses red/negative styling by the generic trend-arrow convention used elsewhere (where negative = bad).
- **Steps:** Render the Cancellation Rate KPI card with its mock `-2` trend value.
- **Expected Result (current behavior, flag as a UX inconsistency):** The card renders with the same red-down styling as any other negative-trend KPI, even though a falling cancellation rate is objectively good — worth a dedicated visual-semantics fix (e.g. an explicit `lowerIsBetter` flag on this specific KPI) rather than reusing the generic trend component unmodified.

### TC-ANLY-FE-007 — Manager Dashboard status-distribution donut labels only segments above the 5% threshold
- **Priority:** Low
- **Preconditions:** Test-plan states in-slice labels only render "if segment > 5%"; the mock's "No-Show" segment sits at ~5.9%, just barely clearing the threshold.
- **Steps:** Render the donut with the mock `statusDistribution` (Completed 47%, Scheduled 35%, Cancelled 12%, No-Show 6%).
- **Expected Result:** All 4 segments show an in-slice label, including "No-Show" at 6% — confirms the boundary case just above the 5% cutoff renders correctly, distinct from a segment sitting just below it (which should have no in-slice label).

### TC-ANLY-FE-008 — Clinician Dashboard offline banner triggers on any data-absent condition, not only network errors
- **Priority:** Medium
- **Preconditions:** Grounded in a documented fix (`BUG-CLIN-007`): the offline `Alert` condition was deliberately broadened from `!data && !!error` to `isMock = !data`, so it also covers timeout and auth-mismatch cases, not just explicit GraphQL errors.
- **Steps:** Simulate a request that resolves with `data: null` but no explicit `error` object (e.g. a timeout-driven abort).
- **Expected Result:** The "Offline — showing demo data" alert still appears — confirms the broadened condition, guarding against a regression back to the narrower `!data && !!error` check.

### TC-ANLY-FE-009 — Clinician Dashboard timeline block has no guard for a patient missing a last name
- **Priority:** Medium
- **Preconditions:** The avatar-initials fallback computes `firstName[0] + lastName[0]` with no optional chaining on `lastName[0]`; this currently only "works" because every mock patient happens to have both names.
- **Steps:** Render the Appointment Detail Drawer for a patient record with `lastName: ''` or `lastName: null`.
- **Expected Result (current behavior, should FAIL until fixed):** Throws when accessing `lastName[0]` on an empty/null string — this test is the concrete reproduction for a gap the results doc itself flagged as untested, not yet a confirmed regression fix.

### TC-ANLY-FE-010 — Clinician Dashboard Add-Block duration preview formats whole hours without a redundant "0m"
- **Priority:** Low
- **Steps:** Enter a block Start/End exactly 60 minutes apart (e.g. 09:00–10:00) in the Add Block drawer.
- **Expected Result:** The live duration preview badge shows `"1h"`, not `"1h 0m"` — confirmed exact formatting behavior (`dur % 60 ? dur%60+'m' : ''` ternary drops the trailing minutes segment only when it's exactly zero).

### TC-ANLY-FE-011 — Patient Dashboard KPI partial-fallback is visible in mock mode
- **Priority:** High
- **Steps:** Force `data?.getPatientKpis` to be `null` in mock mode while `upcomingAppointments` has 2 entries.
- **Expected Result:** "Upcoming" KPI shows `2` (derived live from the appointments array) while "Total"/"Completed"/"Cancelled" show the hardcoded mock values `12`/`9`/`1` — this is the frontend-level confirmation of TC-ANLY-UNIT-008's partial-fallback logic, testable today entirely within the mock store.

### TC-ANLY-FE-012 — Patient Dashboard cancel action is optimistic-only and does not reappear on re-render
- **Priority:** Medium
- **Steps:** In mock mode, cancel an appointment via the dashboard's Cancel dialog, then trigger an unrelated re-render (e.g. resize the window).
- **Expected Result (current behavior):** The cancelled appointment remains hidden (its id stays in the local `cancelledIds` Set for the session) — it does not flicker back into the list on re-render, but also does not survive a full page reload (no backend persistence yet) — both halves of this behavior should be explicitly verified.

### TC-ANLY-FE-013 — Staff Dashboard greeting is hardcoded regardless of time of day
- **Priority:** Low
- **Preconditions:** Grounded in a real, still-pending suggestion (SUG-STFDS-008): the subtitle always reads "Good morning!" literally, with no time-of-day logic, unlike the Admin/Patient dashboards' `getGreeting()` functions.
- **Steps:** Load `/staff` at various times of day (mock the system clock to afternoon and evening).
- **Expected Result (current behavior, flag as a known gap):** The subtitle reads "Good morning!" at every hour — this test documents the gap; it should be re-run once SUG-STFDS-008 is implemented, at which point the expected result becomes time-appropriate greetings matching the pattern used elsewhere.

### TC-ANLY-FE-014 — Staff Dashboard "Check In" undo window is exactly 30 seconds
- **Priority:** Medium
- **Steps:** Check in a queued patient, then use fake timers to advance time by 29 seconds, then by 2 more seconds (31s total).
- **Expected Result:** The "Undo" affordance is still present at 29s and has disappeared by 31s — confirms the exact `setTimeout(..., 30000)` window, not an approximate one.

### TC-ANLY-FE-015 — Greeting time-of-day thresholds are inconsistent across dashboards
- **Priority:** Low
- **Preconditions:** Admin Dashboard's `getGreeting()` uses `<17` for "afternoon"; Patient Dashboard's uses `<18`.
- **Steps:** Mock the system clock to 17:30 and load both `/dashboard` (as admin) and `/patient/dashboard` (as patient).
- **Expected Result (current behavior, flag as an inconsistency):** Admin Dashboard shows an "evening" greeting at 17:30 while Patient Dashboard still shows "afternoon" at the same clock time — both pages should be reconciled to one shared greeting-threshold utility rather than two independently-coded cutoffs.
