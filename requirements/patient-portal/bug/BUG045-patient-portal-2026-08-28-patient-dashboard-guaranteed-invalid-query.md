---
id: BUG045
type: bug
feature: patient-portal
created: 2026-08-28
updated: 2026-08-28
status: open
parent: null
related: []
---

# BUG045 — `/patient/dashboard`'s own data query targets fields that don't exist on the schema — guaranteed 400 on every request, masked by a mock fallback

## Source

Found live during a Chrome-DevTools-driven patient-role QA sweep,
logged in as `patient@medibook.dev` ("Priya Patient"). The dashboard
itself showed a visible, honest banner — **"Could not load live
dashboard data — showing demo information."** — which is the right
pattern in principle (unlike the silent fallbacks found elsewhere this
sweep, e.g. `BUG041`), but the underlying cause is worth fixing, not
just disclosing: this query has never once succeeded, for any patient
account, since the day it shipped.

## What's wrong, exactly

`frontend/src/pages/patient/Dashboard.jsx` lines 49–78:

```graphql
query GetPatientDashboardData($userId: ID!) {
  getPatientAppointments(patientId: $userId, status: "scheduled") { ... }
  getNotifications(userId: $userId, limit: 5) { ... }
  getPatientKpis(patientId: $userId) { ... }
}
```

None of these three field names exist on the real schema. The live
GraphQL error, captured over the network (HTTP 400,
`GRAPHQL_VALIDATION_FAILED`, one error per field):

```
Cannot query field "getPatientAppointments" on type "Query". Did you
mean "getAppointments", "getAppointment", "getPatientReportGroup", or
"patientConsents"?

Cannot query field "getNotifications" on type "Query". Did you mean
"notifications" or "getClinicians"?

Cannot query field "getPatientKpis" on type "Query". Did you mean
"patients"?
```

This is a query-validation failure, not a network/auth/empty-result
condition — it fails identically for every patient account, every
time, unconditionally. Lines 182–184 fall back to `MOCK_UPCOMING`/
`MOCK_NOTIFICATIONS`/`MOCK_KPIS` (comment: "SUG-PTDASH-004") whenever
`data` is absent, which given the above is always. The patient's own
home screen — upcoming appointments, notifications, and visit-count
KPIs — has been 100% fabricated since this page shipped, for every real
patient.

This is the same bug class as the historical `BUG021` finding
(`clinician/Dashboard.jsx`, closed 2026-08-25 — see `CLAUDE.md`'s own
account: "Its read query targeted the wrong ... GraphQL dialect with
fields that don't exist on the real return type ... permanently masked
by an `isMock = !data` fallback into fully-formed fake sample data").
That fix rebuilt the clinician dashboard onto the real, already-
authenticated `appointments(...)` query, self-scoped via the JWT. The
identical sibling bug on the **patient** dashboard was evidently never
found or fixed in that same pass.

## What the real fields likely are (not yet verified as sufficient)

- Appointments: the real, self-scoped `appointments(...)` query
  (already used correctly elsewhere, e.g. `clinician/Calendar.jsx`,
  and by `clinician/Dashboard.jsx` since `BUG021`) — confirm it
  self-scopes a `'patient'`-role caller to their own
  `patient_id`/dependants (`REQ065`'s `ownAndDependantPatientIds`),
  not just clinicians.
- Notifications: the real `notifications(first: Int)` query (confirmed
  live this session, returns `{data: []}` correctly for this account —
  no schema error).
- KPIs (`total`/`completed`/`upcoming`/`cancelled`): no direct
  equivalent query found in this pass — likely needs deriving from the
  real appointments list client-side, matching the shape
  `clinician/Dashboard.jsx` or `staff/Dashboard.jsx` already compute,
  rather than assuming a dedicated backend aggregate exists.

## Acceptance criteria

- `GET_PATIENT_DASHBOARD_DATA` (or its replacement) uses real,
  schema-valid field names — confirm against `backend/src/schema.gql`
  before writing it, per `ARCH-15`.
- The "Could not load live dashboard data" banner and mock fallback are
  removed once real data loads correctly; the fallback path is
  retained only for a genuine network/auth failure, not a permanent
  self-inflicted validation error.
- Live-verified: a patient account with real linked appointment data
  sees its own real upcoming appointments, notifications, and KPIs on
  `/patient/dashboard` — not `MOCK_UPCOMING`/`MOCK_NOTIFICATIONS`/
  `MOCK_KPIS`.
