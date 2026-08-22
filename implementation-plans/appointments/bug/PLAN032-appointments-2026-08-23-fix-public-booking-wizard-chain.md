---
id: PLAN032
type: bug
feature: appointments
created: 2026-08-23
updated: 2026-08-23
status: done
parent: BUG011
related: [BUG010, TP059, TR058]
---

# PLAN032 — Fix the public booking wizard's three-defect chain

Straightforward fixes against already-proven patterns in this codebase (the
`?doctor=` query-string contract both e2e specs already assumed, and the
backend's own numeric day-of-week convention) — no test-suggestions stage
per `REQ013` Phase D.

## 1. Restore and extend the e2e fixture data

**Approach:** the fixture clinician/patient/appointment data eight e2e specs
hardcode (`Sarah Mitchell`, id `8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7`, `Anita
Sharma`) is real data created ad hoc through the live UI in a prior session
and captured in `db-dumps/medibook_db_2026-08-23.sql` — not something
`prisma/seed.ts` creates. `BUG010` flagged this as unrestored on this
machine; the user separately requested "migrate this DB," which is the
already-documented restore procedure in `db-dumps/README.md`.

- Restore: `docker cp` the dump into `medibook_postgres`, `psql -f` it
  (`--clean --if-exists` drops/recreates, safe over the current
  seed-only state).
- Clean up 8 orphaned rows (4 `ClinicianAvailability`, 4 `LunchBreaks`) left
  behind across several prior sessions by `clinician-portal.spec.js`'s
  `afterAll` failing on `ThrottlerException` before it could delete its own
  disposable test data — soft-delete (`is_deleted = true`), matching the
  app's own delete-mutation semantics, not a hard `DELETE`.
- Extend real availability from the original Mon/Tue-only rows to all 7 days
  (09:00–17:00) — `booking-payment.spec.js` needs a real slot to exist
  regardless of which day of the week it happens to run, and nothing in the
  suite asserts absence of availability on any specific day.
- Take a fresh dump reflecting the corrected state and commit it, so the
  fixture travels correctly to the user's other machine (`db-dumps/README.md`'s
  own stated purpose).

## 2. `BookingWizard` never read `?doctor=`

**Approach:** `/appointments/book` has no `:clinicianId` route segment
(`App.jsx`) — `useParams()` can only ever return `undefined` there. The
query string is the only place a clinician id actually arrives, and it's
already the contract both e2e specs assume.

- Import `useSearchParams`; derive `clinicianId` as
  `routeClinicianId || searchParams.get('doctor') || undefined`, keeping the
  now-effectively-dead `useParams()` read rather than removing it, in case a
  future route gains a `:clinicianId` segment.
- No change needed to the `location.state` pre-fill check
  (`location.state.clinicianId === clinicianId`) — it starts working
  correctly once `clinicianId` is populated for real.

## 3. `DoctorProfile`'s "Book Appointment" button targeted a route that doesn't exist

**Approach:** point it at the route that actually renders the wizard, using
the same `?doctor=` contract just wired up in step 2, keeping `state` for
the date/time/type pre-fill it already carried.

- `navigate('/booking', {state})` → `` navigate(`/appointments/book?doctor=${id}`, {state}) ``.

## 4. Numeric/string day-of-week mismatch, in two files

**Approach:** match the backend's own convention exactly rather than
re-deriving one — confirmed live via a direct `getClinicianAvailability`
GraphQL query that `dayOfWeek` is a real Int (`0`=Sunday..`6`=Saturday),
the same convention `dayjs().day()` and the backend's own `availableSlots()`
(`getUTCDay()`) already use.

- `pages/booking/index.jsx` and `pages/public/doctor-profile.jsx`: replace
  `getDayOfWeekString(date.day())` + `a.dayOfWeek === dayName` (string
  compare, always false) with `Number(a.dayOfWeek) === date.day() ||
  a.recurrenceType === 'daily'` (numeric compare, plus the same
  daily-recurrence inclusion `availableSlots()` already applies). Removed
  `getDayOfWeekString` from both files — dead after the fix, no other
  callers.

## 5. Update e2e assertions that were unknowingly matching the mock fallback

**Approach:** `public-booking.spec.js`'s `'Dr. Sarah Mitchell'` and `/AM|PM/`
assertions matched the wizard's own hardcoded mock object's decorative
strings, not anything the real backend returns — confirmed by running the
fixed code and seeing them fail against now-real data. Fix the test to match
what real data actually renders, not what happened to make the old,
silently-broken code path pass.

- `'Dr. Sarah Mitchell'` → `'Sarah Mitchell'` (`getClinician()` returns a
  bare `${first_name} ${last_name}`, no title prefix).
- `/AM|PM/` → `/^\d{2}:\d{2}$/` (`doctor-profile.jsx` renders its own slot
  buttons in `HH:mm`, not the wizard's `h:mm A` — a genuine, separate,
  pre-existing cosmetic inconsistency between the two pages, left unfixed
  here; see `BUG011`'s "what this does not close").

## Verification plan

See `TP059`.
