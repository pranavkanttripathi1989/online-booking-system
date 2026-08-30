---
id: CTX-patients-2026-08-30-bug057
type: bug
feature: patients
created: 2026-08-30
updated: 2026-08-30
status: done
parent: BUG055
related: [BUG057, PLAN228, TP248, TR248]
---

# Appointments tab rows made clickable (2026-08-30)

Follow-up to `BUG055`: the user asked whether they could click a real
"Completed" row on a patient's Appointments tab to reach that
appointment's own detail page — they couldn't. Rows were plain,
non-interactive `TableRow`s. Fixed by matching `patients/index.jsx`'s
own existing accessible click pattern (`onClick` + `tabIndex` +
`role="button"` + `aria-label` + `onKeyDown` for Enter/Space).

## Verification

14/14 unit tests pass (13 pre-existing + 1 new); `eslint` 0 errors.
Live-verified: clicking the real "03/09/2026" row navigates to the exact
appointment the user asked about
(`/appointments/0c4a6cc6-6df5-4c8b-9ec7-7255c89a4225`).

## Documents

- `requirements/patients/bug/BUG057-*.md`
- `implementation-plans/patients/bug/PLAN228-*.md`
- `test-plans/patients/bug/TP248-*.md`
- `test-results/patients/bug/TR248-*.md`
