---
id: TR236
type: bug
feature: patients
created: 2026-08-29
updated: 2026-08-29
status: done
parent: TP236
related: []
---

# TR236 — patient detail tabs overflow — results

## Outcome: PASS

| Case (from `TP236`) | Result |
|---|---|
| 1. Lint clean | ✅ 0 errors |
| 2. Existing unit suite unaffected | ✅ 8/8 green, unmodified |
| 3. Live: scroll affordance appears | ✅ confirmed via screenshot at 1024×800 — a right-chevron scroll button renders next to "Packages" |
| 4. Live: every tab is really reachable | ✅ `take_snapshot`'s accessibility tree lists all 10 real `tab` elements: Overview, Medical History, Appointments (4), Test Results, Documents, Intake Form, Letters (0), Communication Log (2), Insurance (0), Packages (0) |
| 5. Live: clicking a previously-hidden tab works end to end | ✅ clicked "Packages (0)"; it scrolled into view, became the selected tab (underlined, `Mui-selected`), and rendered its real empty-state content ("No packages purchased for this patient yet.", with a working "Sell Package" button) — a left-chevron scroll button appeared to return |

Live-verified against the real dev stack (Chrome DevTools MCP,
`manager@medibook.dev`, real seeded patient "John Michael Doe" — not
a mock/fixture page), not just unit-tested.

## Verdict

Ships as `done`.
