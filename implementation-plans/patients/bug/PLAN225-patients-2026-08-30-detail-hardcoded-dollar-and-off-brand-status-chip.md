---
id: PLAN225
type: bug
feature: patients
created: 2026-08-30
updated: 2026-08-30
status: done
parent: BUG054
related: [TP245, TR245]
---

# PLAN225 — Fix `$` balance chip and off-brand blue status chips in `patients/detail.jsx`

## Files changed

```
frontend/src/pages/patients/detail.jsx       — import formatCurrency; new statusChipSx(theme, status)
                                                 helper replacing STATUS_COLORS; header balance chip
                                                 uses formatCurrency(); both status Chips use
                                                 statusChipSx(theme, status) via sx spread
frontend/src/pages/patients/detail.test.jsx  — renderPage() wrapped in <ThemeProvider theme={createAppTheme('light')}>
```

## Design

- `formatCurrency` (`frontend/src/utils/dateTime.js`, already used elsewhere
  in the app, e.g. `admin/Organizations.jsx`) takes a rupee-denominated
  number directly (`Intl.NumberFormat('en-IN', {style:'currency',
  currency:'INR'})`) — the mock `outstanding_balance` field here is already
  rupees (values like 50/75/120/200 in the mock data), so this is a direct
  drop-in, no paise conversion needed (unlike the file's own `formatInr`,
  which divides by 100 and is used for `price_monthly`, a genuinely
  paise-denominated mock field).
- `statusChipSx(theme, status)` mirrors `Calendar.jsx`'s `statusCfgFor`
  exactly: reads `theme.palette.appointmentStatus[status] ??
  .appointmentStatus.no_show`, returns `{bgcolor, color, border}` for a
  soft alpha-tinted chip, replacing the old `STATUS_COLORS` map + MUI
  `color` prop (which rendered a flat, saturated fill). Both call sites
  (Appointments tab row, Test Results tab card) spread this into the
  Chip's own `sx`.
- `detail.test.jsx` had no `<ThemeProvider>` in its render tree at all —
  a real, previously-undetected gap (this suite never touched
  `theme.palette.appointmentStatus` before, so it never surfaced).
  Wrapped in `createAppTheme('light')`, matching the already-documented
  convention (`FRONTEND_RULES.md` §22, UI-2 entry) established when the
  identical gap was found and fixed in `appointments/index.test.jsx`.

## Verification

- `npx eslint src/pages/patients/detail.jsx` — 0 errors (156 pre-existing
  i18n warnings, unchanged in kind).
- `npx jest src/pages/patients/detail.test.jsx --maxWorkers=2` — 8/8 pass
  (0 before the `ThemeProvider` fix, all 8 crashed on
  `statusChipSx`'s `theme.palette.appointmentStatus[status]` read).
- Live check (Chrome DevTools MCP, real dev stack, `clinician@medibook.dev`):
  `/patients/:id` for the mock-data patient ("John Michael Doe") now shows
  `₹120 Balance` (was `$120 Balance`) and soft-toned green/blue/red status
  chips on the Appointments tab (was flat MUI blue/green/red).

See `TR245` for the full recorded outcome.
