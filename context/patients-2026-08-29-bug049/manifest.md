---
id: CTX-patients-2026-08-29-bug049
type: bug
feature: patients
created: 2026-08-29
updated: 2026-08-29
status: done
parent: BUG049
related: [PLAN216, TP236, TR236]
---

# patients — detail tabs overflow with no scroll affordance (2026-08-29)

User-reported via screenshot: the patient-detail tab row (10 tabs)
was silently clipped past "Communication Log" with no way to reach
the remaining tabs (Insurance, Packages) — a direct `RES-3` violation.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | BUG049 | [Detail tabs overflow](../../requirements/patients/bug/BUG049-patients-2026-08-29-detail-tabs-overflow-not-scrollable.md) |
| implementation-plans | PLAN216 | [implementation plan](../../implementation-plans/patients/bug/PLAN216-patients-2026-08-29-detail-tabs-overflow-not-scrollable.md) |
| test-plans | TP236 | [test plan](../../test-plans/patients/bug/TP236-patients-2026-08-29-detail-tabs-overflow-not-scrollable.md) |
| test-results | TR236 | [results](../../test-results/patients/bug/TR236-patients-2026-08-29-detail-tabs-overflow-not-scrollable.md) |

## What shipped

`pages/patients/detail.jsx`'s `<Tabs>` gained
`variant="scrollable"`/`scrollButtons="auto"`/
`allowScrollButtonsMobile` — MUI's standard scroll-container fix for
this exact overflow class, matching the same pattern this codebase
already uses for wide tables (`<TableContainer>`).

## Verification

Lint clean, existing unit suite (8/8) unaffected, and — unlike a
purely code-reviewed fix — **live-verified** via Chrome DevTools MCP
against the real dev stack: a scroll button now appears where none
did before, all 10 tabs are confirmed reachable via the accessibility
tree (not just visually), and clicking the previously-hidden
"Packages" tab correctly scrolls, selects, and renders real content.
