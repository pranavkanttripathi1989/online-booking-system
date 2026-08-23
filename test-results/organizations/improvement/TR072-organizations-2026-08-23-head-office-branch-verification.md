---
id: TR072
type: improvement
feature: organizations
created: 2026-08-23
updated: 2026-08-23
status: pass
parent: TP073
related: [PLAN046, REQ041]
---

# TR072 — Results: head-office branch designation

All 9 cases in `TP073` pass.

- Unit: 3 new tests in `clinics.service.spec.ts` (17 total in that file
  now, up from 14) — all green. Full backend suite: **719/719 tests, 55
  suites**. `tsc --noEmit`/`eslint` clean.
- Live, against the real dev database (org `3efd3018-9760-4d10-92c0-86981799240b`,
  3 real clinics): `setHeadOfficeClinic` on MG Road Clinic → confirmed
  `is_primary: true` in both the mutation response and a direct `psql`
  query. Switched to Admin Test Clinic → confirmed MG Road's flag was
  correctly unset in the same operation (all three clinics' `is_primary`
  values checked). Then, bypassing the application layer entirely,
  attempted `UPDATE "Clinics" SET is_primary = true WHERE name = 'MG Road
  Clinic'` directly via `psql` while Admin Test Clinic was still primary —
  rejected: `ERROR: duplicate key value violates unique constraint
  "clinics_one_primary_per_org"`. Test data reset to `is_primary = false`
  on all three clinics afterward.
- Frontend: `eslint` clean; full Jest suite **63/63 passed**, no
  regression. No dedicated new frontend test file — no unit-test
  infrastructure existed for this page before, and the change itself
  (a badge plus a mutation-triggering button) is small and already proven
  end to end by the live database verification above; logged as a
  deliberate scope decision in `REQ041`, not a silent gap.

## What this does not close

- `Departments`/`Resources` (the rest of `REQ014`'s hierarchy) — not
  attempted.
- Onboarding-wizard changes — not attempted; a new clinic still defaults
  to `is_primary: false`.
