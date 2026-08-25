---
id: PLAN085
type: bug
feature: appointments
created: 2026-08-25
updated: 2026-08-25
status: done
parent: BUG023
related: []
---

# PLAN085 — Fix `appointments/edit.jsx`'s five compounding defects

Technical implementation plan for `BUG023`, executed and verified. Recorded
here (rather than written before implementation, per the usual working
loop) because defect #5 was found only via live testing partway through
fixing defects #1–#4 and #6 — this document captures the full, real
sequence for the record.

## Backend

None. `AppointmentUpdateInput` is correct as-is; the frontend was the one
out of sync with it.

## Frontend — `frontend/src/pages/appointments/edit.jsx`

1. **Dropdown/fetch error-gating** (defects #1–#2): destructure `error`
   from all three `useQuery` calls; `clinicians`/`rooms` become
   `xError ? MockStore... : (xData?.x ?? [])`; the appointment fetch's `a`
   (in the `useEffect`) and `apt` (at render) become
   `error ? MockStore.getAppointmentById(id) : data?.appointment`.
2. **Real not-found state** (defect #3): a new `isNotFound` flag —
   `error?.graphQLErrors?.[0]?.message === 'Appointment not found'` —
   distinguishes the real backend's `NotFoundException` (a GraphQL error,
   not a null-with-no-error result) from a genuine connectivity/server
   error. `isNotFound` short-circuits the `useEffect`'s `setForm` call and
   gates a new render branch (`Alert severity="warning"` + a "Back to
   Appointments" action) placed after the `fetching` skeleton gate and
   before the `!form` skeleton gate, so a real not-found id never falls
   through to an infinite loading state.
3. **No fake save success** (defect #4): the mutation's `onError` no
   longer branches on "was this a network error" and hand-writes a
   `MockStore` record — it always shows the real `err.message` via
   `enqueueSnackbar`.
4. **`end_datetime` removed from the mutation input** (defect #5, the
   critical one): `AppointmentUpdateInput` has no such field; sending one
   rejected every save unconditionally at the GraphQL variable-coercion
   layer. The "End Date & Time" `DateTimePicker` is now `disabled` (its
   `onChange` removed) with helper text — "Set automatically from the
   service duration" — replacing the now-unreachable "must be after
   start" validation text in the non-error case. The `endBeforeStart`
   check still compares the (now fixed) original `form.end` against a
   possibly-edited `form.start`, which is still a meaningful conflict
   check even though `end` itself can't be edited.
5. **`STATUS_OPTIONS` includes `'scheduled'`** (defect #6).

## Testing (see `TP112`)

- `frontend/src/pages/appointments/edit.test.jsx` (new, 7 cases): real
  data render, empty-dropdown real-vs-mock, not-found via null result,
  not-found via a real GraphQL error message, a full save round trip
  asserting the mutation mock's variables **exclude** `end_datetime`
  (this is the direct regression guard for defect #5 — the test would
  hang/fail if the fix regressed, since `MockedProvider` only resolves a
  mock whose variables match exactly), the End Date & Time field's
  `disabled` state, and the existing degraded-mode-on-genuine-error case.
- `frontend/e2e/appointments-edit.spec.js` (new, 3 cases against the real
  backend): real fetched data (not mock names), a real edit that survives
  a page reload (the exact path defect #5 broke, end to end), and a real
  nonexistent-id not-found state.

## What this does not close

`appointments/index.jsx`/`calendar/index.jsx` already have the correct
error-gating pattern from an earlier pass — not touched here. No other
page currently sends `end_datetime` to `updateAppointment` (confirmed via
grep) — this defect was isolated to this one file.
