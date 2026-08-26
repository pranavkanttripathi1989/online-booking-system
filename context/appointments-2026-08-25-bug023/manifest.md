---
id: CTX-appointments-2026-08-25-bug023
type: bug
feature: appointments
created: 2026-08-25
updated: 2026-08-25
status: done
parent: BUG023
related: [PLAN085, TP112, TR111, project-plans/analysis/08-integration-gap-analysis.md]
---

# appointments — BUG023, edit page fake data + broken save (2026-08-25, closed same day)

Started as `project-plans/analysis/08-integration-gap-analysis.md` finding B-2
(clinician/room dropdown mock fallback, S2). Reading the whole file to fix
that narrow finding surfaced four more real defects in the same file —
the worst found only by live-testing the fix: `AppointmentUpdateInput`
has no `end_datetime` field, and `edit.jsx` sent one unconditionally,
rejecting every save at the GraphQL variable-coercion layer since the
page shipped. Filed as one bug (`BUG023`, all defects in one file) rather
than folded into B-1's `platform-nfr` precedent — this is a single-page,
single-domain fix, matching B-1's own reasoning for using a dedicated
slug instead.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | BUG023 | [edit page fake data and broken save](../../requirements/appointments/bug/BUG023-appointments-2026-08-25-edit-page-fake-data-and-broken-save.md) |
| implementation-plans | PLAN085 | [fix](../../implementation-plans/appointments/bug/PLAN085-appointments-2026-08-25-fix-edit-page-fake-data-and-broken-save.md) |
| test-plans | TP112 | [test plan](../../test-plans/appointments/bug/TP112-appointments-2026-08-25-edit-page-fake-data-and-broken-save.md) |
| test-results | TR111 | [results — all green](../../test-results/appointments/bug/TR111-appointments-2026-08-25-edit-page-fake-data-and-broken-save.md) |

## What shipped

Six fixes in `frontend/src/pages/appointments/edit.jsx`:
1. Clinician/room dropdowns and the appointment fetch itself gated on a
   real `error` only, not a `.length`/`??` truthy check.
2. A real "Appointment not found" state (distinguishing the backend's
   real `NotFoundException` GraphQL error from a genuine connectivity
   error) instead of an infinite loading skeleton.
3. A failed save always shows a real error — no more silent "mock mode"
   fake-success write to an in-memory `MockStore` record.
4. **`end_datetime` removed from the save mutation's input entirely** —
   the actual root cause of a page whose Save button had never once
   worked. The End Date & Time picker is now `disabled` with helper text,
   since end time isn't independently settable on this backend.
5. `STATUS_OPTIONS` gained the missing `'scheduled'` status.

New `edit.test.jsx` (7 cases, including a direct regression guard for the
`end_datetime` defect) and `frontend/e2e/appointments-edit.spec.js` (3
cases against the real backend).

## Verification

Full Hard Rule 3 suite green: frontend lint clean (162 warnings, ratchet
held), frontend unit 97/99 (2 pre-existing unrelated
`booking/index.test.jsx` contention-flake failures), build clean,
`check-page-data-wiring.mjs` clean, new e2e spec 3/3. No backend changes.
See `TR111` for the live-reproduction evidence of defect #5 before the
fix — a direct GraphQL variable-coercion rejection captured from the
browser console, confirmed via a direct backend query that nothing had
persisted.

## What this does not close

The remaining findings in `project-plans/analysis/08-integration-gap-analysis.md`
(A-2 through A-10, B-3, B-4) are still open, per that document's own "Fix
sequencing" section.
