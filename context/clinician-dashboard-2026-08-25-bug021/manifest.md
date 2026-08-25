---
id: CTX-clinician-dashboard-2026-08-25-bug021
type: bug
feature: clinician-dashboard
created: 2026-08-25
updated: 2026-08-25
status: done
parent: BUG021
related: [PLAN083, TP110, TR109, project-plans/08-integration-gap-analysis.md]
---

# clinician-dashboard — BUG021, dashboard fabricated end to end (2026-08-25, closed same day)

Found via `project-plans/08-integration-gap-analysis.md` (finding B-1, the
one S1 in that sweep) — a fresh backend↔frontend integration audit that
cross-checked every backend operation against real frontend usage and
individually re-classified every remaining `mocks/store`/`useMockData`
import. `clinician/Dashboard.jsx` still importing `useMockMutation`
warranted opening the file, which led to reading its own GraphQL query
field-by-field against the real schema and finding it targets the wrong
(public, patient-self-serve) dialect with fields that don't exist on the
real return type — a guaranteed validation error on every request,
permanently masked by an `isMock = !data` fallback into fully-formed fake
sample data, with both write actions ("Save Block", "Mark Complete") also
entirely local-only.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | BUG021 | [dashboard fabricated end to end](../../requirements/clinician-dashboard/bug/BUG021-clinician-dashboard-2026-08-25-fabricated-end-to-end.md) |
| implementation-plans | PLAN083 | [rebuild on real data](../../implementation-plans/clinician-dashboard/bug/PLAN083-clinician-dashboard-2026-08-25-rebuild-on-real-data.md) |
| test-plans | TP110 | [test plan](../../test-plans/clinician-dashboard/bug/TP110-clinician-dashboard-2026-08-25-rebuild-on-real-data.md) |
| test-results | TR109 | [results — all green](../../test-results/clinician-dashboard/bug/TR109-clinician-dashboard-2026-08-25-rebuild-on-real-data.md) |

## What shipped

- `frontend/src/pages/clinician/Dashboard.jsx` rebuilt onto real,
  authenticated queries: a dedicated `network-only` profile query (works
  around the same `AuthContext` login-cache gap already documented for
  `user.patient.id`, now confirmed to also apply to `user.clinician`), the
  real `appointments(...)` query (self-scoped server-side via the JWT,
  same primitive `clinician/Calendar.jsx` already uses correctly), and the
  real `createSpacerBlock`/`completeAppointment` mutations replacing both
  `useMockMutation` calls. The `isMock`/`MOCK_APPOINTMENTS`/
  `MOCK_SPACERS`/`MOCK_LUNCH` fallback path is deleted outright — a real
  query error or an unlinked clinician account now renders a real error/
  empty state instead of fabricated data (the fake `|| 12`/`|| 5`/`|| 7`/
  `|| 3` KPI-card fallbacks were the same bug pattern at smaller
  granularity, found and fixed in the same pass).
- `backend/src/blocks/{blocks.resolver.ts,blocks.service.ts}` —
  `createSpacerBlock`'s `@Auth` widened to include `'clinician'` (was
  manager/admin/super_admin only, while the sibling read query had
  already been widened), plus a service-level self-scope check so a
  clinician caller can only ever create a block attributed to their own
  `clinician_id`. Found while writing the implementation plan, not
  discovered by a failing test — without it, the rebuilt page's "Save
  Block" action would 403 for every real clinician.
- New `frontend/src/pages/clinician/Dashboard.test.jsx` (5 cases) and
  `frontend/e2e/clinician-dashboard.spec.js` (3 cases, against the real
  backend, linking the demo `clinician@medibook.dev` account to the real
  seeded clinician for the run's duration — same pattern as
  `clinician-portal.spec.js`).
- 2 new `blocks.service.spec.ts` cases for the widened `createSpacerBlock`
  self-scope check.

## A second real bug found while writing the e2e spec, not the page itself

A fixed local-clock-hour fixture (`Date#setHours` + `toISOString()`) is
timezone-ambiguous on this host (IST, UTC+5:30) — an early-morning IST
hour converts to the *previous* UTC calendar day, silently missing the
backend's UTC-bounded `date_from`/`date_to` "today" filter and colliding
with its own earlier run's leftover appointment on that other day instead
of failing loudly. Same class of gap as `context/open-questions.md` #15
(documented there for the isolated e2e stack's missing container `TZ`),
now confirmed to also bite a plain host-side fixture computation. Fixed by
anchoring the fixture to `Date.now()` minus a few hours instead of a fixed
clock hour, and having the spec's own `beforeAll` cancel any leftover
*scheduled* same-named fixture before creating a fresh one.

## Verification

Full Hard Rule 3 suite green: backend unit 1217/1217, backend integration
369/369, backend lint/typecheck clean; frontend lint clean (162 warnings,
ratchet held), frontend unit 86/87 (the one failure is a pre-existing,
unrelated `booking/index.test.jsx` full-suite-contention flake, confirmed
7/7 in isolation), frontend build clean, `check-page-data-wiring.mjs`
clean; new e2e spec 3/3 against the real backend on two consecutive full
runs. See `TR109` for full detail, including live confirmation that the
fixture appointment's real `createAppointment` call fired the real
`NotificationTriggerService` pipeline — proof this exercises the same
write path a genuine booking takes, not a shortcut.

## What this does not close

Same two residual notes as `BUG021` itself: the seeded
`clinician@medibook.dev` demo account remains unlinked to a real
`Clinicians` row by default (this fix makes that state render correctly —
a real prompt, not fake data — it doesn't link the account); no other
role's dashboard shares this defect (each was individually re-verified
during the originating gap analysis). The remaining 11 findings in
`project-plans/08-integration-gap-analysis.md` (A-1 through A-10, B-2
through B-4) are still open, sequenced per that document's own "Fix
sequencing" section — this bundle closes only B-1.
