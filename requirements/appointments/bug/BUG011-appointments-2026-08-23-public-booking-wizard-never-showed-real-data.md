---
id: BUG011
type: bug
feature: appointments
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ018
related: [BUG009, BUG010]
---

# BUG011 — The public booking wizard never showed real data, and its own e2e coverage never caught it

## Severity

S1. The single conversion path a booking SaaS exists for — a real anonymous
visitor viewing a real doctor's real availability and completing a real
booking — was completely broken end to end, in three independent ways, for
every clinician, every time. Masked from detection because the wizard's own
hardcoded mock-fallback clinician happened to share a name with the real
seeded clinician used in every e2e spec that exercises this flow.

## How this was found

`BUG010`'s "what this does not close" section flagged that
`e2e/manager-clinicians-patients.spec.js` failed on a freshly migrated-and-
seeded database because the dev DB's `db-dumps/` snapshot (containing the
ad hoc "Sarah Mitchell"/"Anita Sharma" fixtures eight other e2e specs also
hardcode) had never actually been restored on this machine. Restoring it
(`db-dumps/medibook_db_2026-08-23.sql`) fixed that spec, but auditing why
`booking-payment.spec.js` and `public-booking.spec.js` — which use the same
fixture clinician — had been passing all along led to reading
`pages/booking/index.jsx` and `pages/public/doctor-profile.jsx` end to end
rather than just running the specs green and moving on.

## The three defects

### 1. `/appointments/book` never read the `?doctor=` query string at all (S1)

`App.jsx` registers the wizard at a bare `path="/appointments/book"` — no
`:clinicianId` route segment. `BookingWizard` derived its clinician id
exclusively from `useParams().clinicianId`, which is `undefined` on every
visit to this route, including every one built with `?doctor=<id>` (both
e2e specs, and the only URL shape `DoctorProfile`'s own CTA is meant to
produce). With `clinicianId` always `undefined`, the `GET_CLINICIAN_AND_PRODUCTS`
query was always `skip`ped, and `renderStep0()`'s pre-existing "no id in the
URL" fallback — a hardcoded mock object literally named `'Dr. Sarah
Mitchell'` at `'HealthSync Medical Centre'` — rendered unconditionally
instead. Every booking made through this page, by every anonymous visitor,
for the entire time this route has existed, was against fabricated data.

This was invisible in both e2e specs because the mock's hardcoded name is
character-for-character identical to the real seeded clinician's name
(`Sarah Mitchell`) — `getByText('Dr. Sarah Mitchell')` matched the mock's
`'Dr. Sarah Mitchell'` (note the "Dr." prefix the mock adds and the real
`getClinician()` service never does), not real data, for as long as this
spec has existed.

### 2. The real "Book Appointment" button on a real doctor profile 404'd, always (S1)

`pages/public/doctor-profile.jsx`'s `navigateToBooking()` called
`navigate('/booking', {...})`. No route named `/booking` exists — only
`/appointments/book` and a redirect-only `/booking/search`. Every click of
the real, correctly-data-loaded "Book Appointment" button on a real
`/doctor/:id` page landed on the catch-all `*` route (`NotFoundPage`). No
e2e spec ever clicked this button — both specs construct their own
`?doctor=` URL directly rather than following the real click-through
journey — so this had zero test coverage in either direction and nothing
ever exercised the actual link between these two real pages.

### 3. `dayOfWeek` (a real Int) was compared to a day-name string, in two files (S2)

`getClinicianAvailability` returns `dayOfWeek` as the raw `Int` column value
(`0`=Sunday..`6`=Saturday, matching `dayjs().day()` and the backend's own
`availableSlots()` `getUTCDay()` convention — confirmed live via a direct
GraphQL query: `{"dayOfWeek":2,...}`, `{"dayOfWeek":1,...}`, never a string).
Both `pages/booking/index.jsx` and `pages/public/doctor-profile.jsx`
independently computed a day name (`'Monday'`, `'Tuesday'`, ...) and filtered
availability with `a.dayOfWeek === dayName` — a number can never strictly
equal a string, so this comparison was always `false`, on every day, for
every clinician, in both files. Real availability could never surface; only
mock/empty states ever rendered from this code path.

This compounded with defect #1: even after fixing the query-param bug so
`booking/index.jsx` actually fetched real data, the real availability still
wouldn't have rendered without this fix too — the two defects independently
guaranteed the same outcome (no real slots, ever) for different reasons.

## Fix

- `pages/booking/index.jsx`: derive `clinicianId` from `useSearchParams().get('doctor')`
  (falling back to the — now still present but never populated on this
  route — `useParams().clinicianId`), so the query actually runs. Replaced
  the string-based day filter with `Number(a.dayOfWeek) === dow || a.recurrenceType === 'daily'`,
  matching the backend's own convention.
- `pages/public/doctor-profile.jsx`: `navigateToBooking()` now targets
  `` `/appointments/book?doctor=${id}` `` (state is still passed for the
  date/time/type pre-fill). Same day-of-week numeric-comparison fix as above.
- `db-dumps/medibook_db_2026-08-23.sql`: restored on this machine (closing
  `BUG010`'s open item), then extended with 5 more `ClinicianAvailability`
  rows for the seeded clinician so real availability exists on every day of
  the week, not just the original Mon/Tue — the e2e suite must not be
  date-dependent on which day it happens to run. Also soft-deleted 8 orphaned
  disposable rows (`ClinicianAvailability`/`LunchBreaks`) left behind by
  `clinician-portal.spec.js`'s `afterAll` cleanup failing on `ThrottlerException`
  during a prior batch run — pre-existing debris the dump had been carrying
  since 2026-08-22, unrelated to this bug's root cause but blocking a clean
  re-run.
- `e2e/public-booking.spec.js`: the `'Dr. Sarah Mitchell'` and `/AM|PM/`
  assertions were themselves matching the mock fallback's own decorative
  strings, not real rendered output — updated to `'Sarah Mitchell'` (what
  `getClinician()` actually returns) and `/^\d{2}:\d{2}$/` (the real 24-hour
  slot-button label `doctor-profile.jsx` renders, distinct from the wizard's
  own `h:mm A` formatting — a pre-existing, cosmetic, unfixed inconsistency
  between the two pages, left alone here as out of scope for this bug).

## Verification

Live GraphQL query against the real backend confirmed `dayOfWeek` is
returned as an Int, not a string, before writing the fix. All 8 e2e specs
that exercise this fixture clinician re-run individually and together:
`manager-clinicians-patients` (5/5), `calendar` (2/2), `manager-appointments`
(3/3), `manager-availability-blocks` (2/2), `public-booking` (2/2),
`booking-payment` (1/1), `clinician-portal` (2/2) — all green, two incidental
login-throttle failures during a combined batch run reproduced as passing in
isolation (not a regression). Frontend `eslint` clean on both touched pages
(pre-existing warnings only, 0 new). Frontend `npm test` green (4/4,
unaffected — no unit coverage exists for either page). See `TR058`.

## What this does not close

- `doctor-profile.jsx` and `booking/index.jsx` still format slot-button
  labels differently (`HH:mm` vs `h:mm A`) — a real, minor UI inconsistency
  between the two surfaces a real visitor could bounce between, left alone
  since fixing it is a design-consistency choice, not a correctness bug.
- No unit test exists for either file's clinician-id resolution or
  day-of-week filtering — only e2e coverage. A future change to either page
  could reintroduce a similar defect with no unit-level guard rail.
- The underlying `db-dumps/*.sql` fixture-restore step is still a manual,
  undocumented-in-CI prerequisite for this e2e coverage to be meaningful — a
  fresh CI runner would need it restored (or the affected specs' fixtures
  rebuilt via `prisma db seed` instead of a hand-maintained dump) before
  these 8 specs would pass there. Not addressed here; flagged for whoever
  wires e2e into CI (`CLAUDE.md`'s "e2e is not in CI, deliberately" note).
