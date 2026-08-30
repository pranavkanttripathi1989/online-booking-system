---
id: PLAN228
type: bug
feature: patients
created: 2026-08-30
updated: 2026-08-30
status: done
parent: BUG057
related: [TP248, TR248]
---

# PLAN228 — Make `patients/detail.jsx` Appointments tab rows clickable

## Design

Matched the exact existing, accessible pattern from
`patients/index.jsx`'s own list rows (`onClick` +
`tabIndex={0}` + `role="button"` + `aria-label` + `onKeyDown` for
Enter/Space) rather than inventing a new one — the same class of gap
`appointments/index.jsx` avoids by using a dedicated `IconButton` per
row; here a whole-row click matches this codebase's own list-page
precedent more closely, since the table has no other per-row actions.

## Files changed

```
frontend/src/pages/patients/detail.jsx       — TableRow gains onClick/tabIndex/role/aria-label/onKeyDown
frontend/src/pages/patients/detail.test.jsx  — new AppointmentDetailMarker route + 1 new test
```

## Verification

- Unit: `detail.test.jsx` 14/14 pass (13 pre-existing + 1 new).
- `npx eslint`: 0 errors.
- Live (Chrome DevTools MCP, real dev stack, `clinician@medibook.dev`):
  clicked the real "03/09/2026" row on Priya Patient's Appointments tab
  → navigated to `/appointments/0c4a6cc6-6df5-4c8b-9ec7-7255c89a4225` —
  the exact appointment the user asked about, confirmed rendering
  correctly.

See `TR248` for the full recorded outcome.
