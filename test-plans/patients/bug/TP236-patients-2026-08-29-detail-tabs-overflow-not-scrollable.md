---
id: TP236
type: bug
feature: patients
created: 2026-08-29
updated: 2026-08-29
status: approved
parent: PLAN216
related: [TR236]
---

# TP236 — patient detail tabs overflow — test plan

## Cases

1. **Lint clean.** `npx eslint src/pages/patients/detail.jsx` — 0
   errors.
2. **Existing unit suite unaffected.** `npx jest src/pages/patients/
   detail.test.jsx` — all pre-existing cases still pass.
3. **Live: scroll affordance appears.** At a viewport width narrower
   than the full 10-tab row (matching the reported ~1024px case), a
   right-chevron scroll button is visible where none existed before.
4. **Live: every tab is really reachable, not just visible.** A
   snapshot of the accessibility tree lists all 10 `tab` elements
   (Overview, Medical History, Appointments (N), Test Results,
   Documents, Intake Form, Letters (N), Communication Log (N),
   Insurance (N), Packages (N)) as real, selectable elements.
5. **Live: clicking a previously-hidden tab works end to end.**
   Clicking the last tab ("Packages") scrolls it into view, selects
   it, and renders its real content (not a blank/broken panel).

## Out of scope

A full responsive sweep of every other viewport in `FRONTEND_RULES.md`
§5's test matrix for this one page — the fix is MUI's own standard
scrollable-Tabs mechanism, verified at the exact width the bug was
reported at.
