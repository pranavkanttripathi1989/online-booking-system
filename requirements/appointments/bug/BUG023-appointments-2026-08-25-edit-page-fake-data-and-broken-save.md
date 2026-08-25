---
id: BUG023
type: bug
feature: appointments
created: 2026-08-25
updated: 2026-08-25
status: open
parent: null
related: []
---

# BUG023 — `appointments/edit.jsx` fell back to fake data on empty results and its own Save button has never actually worked

## Severity

S2, escalated in practice: what started as `project-plans/08-integration-gap-analysis.md`'s narrowly-scoped finding B-2 (clinician/room dropdown mock fallback) turned out, on reading the whole file, to be five compounding real defects — the worst of which (defect #5) means **no edit made through this page has ever actually saved**, for any appointment, ever, since the day it shipped.

## How this was found

`project-plans/08-integration-gap-analysis.md` (finding B-2) flagged the clinician/room dropdown fallback specifically. Reading the whole file to fix that narrow finding surfaced four more real defects in the same file — three found by reading the code, one (the most severe) found only by live-testing the fix against the real backend.

## The five defects

### 1. Clinician/room dropdowns faked data on a genuine empty result (the originally-flagged finding)

`cliniciansData?.clinicians?.data?.length ? ... : MockStore.getClinicians()` and the equivalent for rooms — a `.length` truthy check, not an error gate. The same anti-pattern already fixed twice elsewhere in this codebase (`appointments/index.jsx`, `calendar/index.jsx`).

### 2. The appointment fetch itself never read `error` at all

`const { data, loading: fetching } = useQuery(APPOINTMENT_DETAIL_QUERY, ...)` — no `error` destructured. `const a = data?.appointment ?? MockStore.getAppointmentById(id)` used `??`, which also fires on a genuine fetch error (where `data` stays `undefined`), silently rendering a fabricated appointment in the edit form with zero indication anything was wrong.

### 3. A genuinely nonexistent appointment left the page stuck on an infinite loading skeleton

`if (fetching || !form) return <Skeleton/>` — if the real backend correctly returns "not found" and `form` never gets set (because the useEffect's `if (!a) return` guard fires), the page shows a loading skeleton forever, with no path out. Confirmed live: the real backend returns "not found" as a **GraphQL error** (`NotFoundException`, not a null-with-no-error result), which also had to be specifically distinguished from a real connectivity/server error (message-checked, not just presence-checked) to route to the correct not-found UI instead of the degraded MockStore fallback.

### 4. A failed save silently pretended to succeed

The mutation's `onError` handler checked for a network error and, if found, hand-wrote the edit into an in-memory `MockStore` record, showed **"Appointment updated successfully (mock mode)"**, and navigated away — as if the change had been persisted, when nothing reached the real database.

### 5. The Save button has never actually worked — `AppointmentUpdateInput` has no `end_datetime` field

Found live, not by reading code: `handleSubmit` unconditionally sends `end_datetime: form.end.toISOString()` in the mutation input. `AppointmentUpdateInput` (`backend/src/appointments/dto/appointment.input.ts`) has no `end_datetime` field at all — only `status`, `start_datetime`, `clinician_id`, `room_id`, `notes`, `cancellation_reason`. Sending an undefined field rejects the **entire mutation** at the GraphQL variable-coercion layer, before it ever reaches the resolver:

```
Variable "$input" got invalid value {...}; Field "end_datetime" is not
defined by type "AppointmentUpdateInput". Did you mean "start_datetime"?
```

Since `form.end` is always populated from the loaded appointment (never `undefined`), this fires on **every single save, unconditionally** — a real user clicking "Save Changes" on this page has never once succeeded, since the page shipped. No console error was visible in manual testing terms — Apollo's `onError` correctly caught it and showed a toast, but the failure mode (nothing happens, no navigation) reads exactly like a UI bug on first glance, not a schema mismatch.

**A sixth, smaller finding surfaced fixing #5's regression test**: `STATUS_OPTIONS` (`['pending','confirmed','cancelled','completed','no_show']`) is missing `'scheduled'` — a real, valid status (`AppointmentUpdateInput`'s own `@IsIn` list) and the actual default status of a freshly-created appointment. Every fresh appointment's Status dropdown showed a real MUI "out-of-range value" console warning.

## Fix

- Dropdowns and the appointment fetch: gate on `error` only, matching the established convention (`error ? MockStore... : real`).
- Real not-found (via a GraphQL error message match, not just error presence) renders a real "This appointment could not be found" state.
- A real save failure always shows a real error toast — no "mock mode" fake success.
- `end_datetime` removed from the mutation's `input` entirely; the End Date & Time picker is now `disabled` (end time isn't independently editable on this backend — it's derived from the service duration) with helper text explaining why, rather than silently discarding an edit the user thinks they made.
- `STATUS_OPTIONS` includes `'scheduled'`.

## Verification

New `frontend/src/pages/appointments/edit.test.jsx` (7 cases, including a
direct regression test for defect #5 — a mock that only matches if
`end_datetime` is absent from the mutation variables) and
`frontend/e2e/appointments-edit.spec.js` (3 cases against the real
backend, including a real edit that survives a page reload — the exact
path that was silently broken end to end before this fix).
