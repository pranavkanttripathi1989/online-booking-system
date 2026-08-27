---
id: PLAN193
type: improvement
feature: appointments
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ152
related: [REQ152, TP213, TR213]
---

# PLAN193 — No-show risk score (P1-17)

## Backend

- `backend/src/appointments/no-show-risk.ts` — pure `computeNoShowRisk()`.
  History weighted to 80 (not the 70-point `HIGH_LEVEL_CUTOFF`) so that
  hitting the org's own configured threshold alone is *always* enough to
  reach `'high'`, even after the same-day lead-time discount stacks
  against it in the worst case — preserves REQ052's exact pre-existing
  guarantee (verified: all 3 of its own pre-existing tests passed
  unmodified against the new scoring logic).
- `appointments.service.ts#create()` — `INCLUDE.clinic` widened to
  `{include: {client_organization: true}}` (was a bare `true`) so
  `toGraphQL()` can read the org's threshold for every list/detail read,
  not just at create time. `no_show_risk` computed inline in
  `toGraphQL()` from `a.patient.no_show_count` (already loaded via
  `INCLUDE.patient: true`), `a.created_at`→`a.appointment_time` (lead
  time at booking), and `!a.booked_by_user_id` (channel — a coarser
  proxy than create-time's own `user.roles.includes('patient')` check,
  since this canonical path always stamps *some* caller id including a
  patient's own; documented as an accepted approximation for a minor,
  +10 factor).
- `backend/src/appointments/appointment-reminder-sweep.service.ts` — new,
  registered in `appointments.module.ts`. Mirrors `no-show-sweep.service.ts`
  exactly: hourly `@Cron`, per-row try/catch, queries the identical
  `status: 'confirmed'` population. `reminder_count` (new column) gates
  both windows; an unlinked patient (no login account) still gets its
  `reminder_count` incremented so it isn't retried forever, matching
  every other notify path's own "silently a no-op" convention for that
  case.
- `AppointmentInput`/`AppointmentType` — no schema change needed for the
  risk feature itself; `no_show_risk` is a new `NoShowRiskType`
  `@ObjectType`, `Appointments.reminder_count Int @default(0)` is the
  one new column (migration `20260827130000_no_show_risk`).

## Frontend

- `appointments/index.jsx` — page-local `APPOINTMENTS_WITH_RISK_QUERY`
  (spreads the shared `AppointmentFields` fragment plus a sibling
  `no_show_risk` selection — never edits the shared fragment/query
  itself, which `calendar/index.jsx`, `waiting-room/index.jsx`,
  `patient/Appointments.jsx`, and `staff/Appointments.jsx` also consume).
  New `NoShowRiskChip` + `RISK_CFG`, each level with its own icon
  (`ErrorRoundedIcon`/`WarningAmberRoundedIcon`/
  `CheckCircleOutlineRoundedIcon`), matching `StatusChip`'s own existing
  styling convention in this file (hardcoded hex — the file's own
  pre-existing pattern, not new debt beyond what already exists there).
- `BookingStep5Confirm.jsx` — the `awaiting_payment` fix. `CREATE_APPOINTMENT_MUTATION`
  (`graphql/mutations.js`, single consumer — confirmed before editing)
  gained `no_show_risk { score level reasons }`. New `AwaitingPaymentScreen`,
  rendered instead of `SuccessScreen` when `status === 'awaiting_payment'`.

## Testing

- **Backend unit**: `no-show-risk.spec.ts` (9 — scaling, threshold
  respect, lead-time/channel factors, capping), 8 new
  `appointments.service.spec.ts` cases (2 REQ052-regression-preserving
  checks unmodified + 2 new risk-joining cases + 1 `no_show_risk`
  read-time exposure case), `appointment-reminder-sweep.service.spec.ts`
  (11 — window gating, intensity by risk level, per-row failure
  isolation, unlinked-patient no-op).
- **Backend integration**: `no-show-risk.int-spec.ts` (3, real Postgres +
  real GraphQL) — a clean-history booking not forced into prepayment; a
  real-history, self-booked, far-out booking forced into it; and a
  live-computed `no_show_risk` on read, reflecting a patient-history
  change made *after* the appointment was created (proving it is never a
  stored/stale value).
- **Frontend unit**: `appointments/index.test.jsx` (new file, 3 — high/
  low-risk chip + icon, tooltip reasons), `BookingStep5Confirm.test.jsx`
  (new file, 4 — normal success unaffected, `awaiting_payment` never
  shows the success screen, risk-driven reasons surfaced, the "Collect
  Payment Now" button navigates to the real detail-page action).

## Errors found and fixed during this slice

1. **A scoring-weight bug caught by my own regression test**: the first
   draft weighted no-show history to 70 points (matching
   `HIGH_LEVEL_CUTOFF` exactly) — with the same-day lead-time discount
   (-10) stacked on top, hitting the org's configured threshold exactly
   could land at 60, just under the cutoff, silently breaking REQ052's
   own "threshold reached == forced prepayment" guarantee for a same-day
   booking. Caught by the pre-existing "forces awaiting_payment once
   no_show_count reaches the org threshold" test before it could ship;
   fixed by raising the weight to 80.
2. **jsdom lacks `ResizeObserver`**, which MUI DataGrid needs to measure
   its container — the first attempt at `appointments/index.test.jsx`
   rendered zero rows with no error, the same class of silent gap
   `EncounterWorkspace.test.jsx`'s own recharts stub already documents
   for a different component. Fixed with the identical stub pattern.
   Separately, the page defaults to the `'upcoming'` view tab, which
   builds a real `{date_from: <today>}` filter computed from `dayjs()` at
   render time — a fixed mock `variables` object could never match it;
   fixed with a `variableMatcher`, the same technique already used for
   an identical "now"-dependent query in `video/index.test.jsx`.
