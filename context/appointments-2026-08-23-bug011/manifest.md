---
id: CTX-appointments-2026-08-23-bug011
type: bug
feature: appointments
created: 2026-08-23
updated: 2026-08-23
status: done
parent: BUG011
related: [BUG010, REQ018]
---

# appointments — BUG011, the public booking wizard never showed real data (2026-08-23)

Found while closing `BUG010`'s open item (the e2e fixture-data dump was never
restored on this machine). Restoring it and asking why the booking-flow
specs had been passing anyway — rather than just moving on once green — led
to reading `pages/booking/index.jsx` and `pages/public/doctor-profile.jsx`
end to end and finding three independent, compounding defects that meant the
single most business-critical page in a booking SaaS never showed real data
to a real anonymous visitor.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | BUG011 | [never showed real data, in three ways](../../requirements/appointments/bug/BUG011-appointments-2026-08-23-public-booking-wizard-never-showed-real-data.md) |
| implementation-plans | PLAN032 | [fix the three-defect chain](../../implementation-plans/appointments/bug/PLAN032-appointments-2026-08-23-fix-public-booking-wizard-chain.md) |
| test-plans | TP059 | [verification plan](../../test-plans/appointments/bug/TP059-appointments-2026-08-23-public-booking-wizard-chain-verification.md) |
| test-results | TR058 | [verification results](../../test-results/appointments/bug/TR058-appointments-2026-08-23-public-booking-wizard-chain-verification.md) |
| test-suggestions | — | skipped — fixes against an already-established contract, not exploratory |

## What changed

| File | Change | Commit |
|---|---|---|
| `pages/booking/index.jsx` | `clinicianId` now read from `?doctor=` via `useSearchParams`; day-of-week filter fixed to a numeric comparison | `f8715d0` |
| `pages/public/doctor-profile.jsx` | "Book Appointment" now navigates to `/appointments/book?doctor=<id>` (was `/booking`, a 404); same day-of-week fix | `f8715d0` |
| `e2e/public-booking.spec.js` | assertions updated to match real rendered output, not the mock's decorative strings | `8e2a9d5` |
| `db-dumps/medibook_db_2026-08-23.sql` | restored on this machine; seeded clinician's availability extended to all 7 days; 8 orphaned test rows soft-deleted | `92f45e6` |

## Outcome

A real anonymous visitor can now: view a real doctor's real profile, click
"Book Appointment" without hitting a 404, land on the wizard with that
doctor's real data loaded (not a hardcoded mock), and see that doctor's
real available time slots regardless of which day of the week they visit.
All 8 e2e specs sharing the fixture clinician are green, both individually
and batched.

## What this does not do

- Does not unify the two pages' slot-button label formats (`HH:mm` vs
  `h:mm A`) — a real but cosmetic inconsistency, left as-is.
- Does not add unit-level coverage for either page's clinician-id resolution
  or day-of-week filtering — e2e is the only guard rail against a regression
  here.
- Does not wire the `db-dumps/` restore step into CI — e2e is deliberately
  not in CI yet (see `CLAUDE.md`), and this fixture dependency would need to
  be resolved (restore the dump, or rebuild these fixtures via `prisma db
  seed`) before these 8 specs would be meaningful there.
