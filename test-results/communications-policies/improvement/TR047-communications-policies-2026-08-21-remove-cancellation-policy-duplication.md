---
id: TR047
type: improvement
feature: communications-policies
created: 2026-08-21
updated: 2026-08-21
status: passed
parent: REQ010
related: [PLAN019, TP048]
---

# Test result — remove duplicate Cancellation Policy sliders (REQ010/PLAN019/TP048)

**Outcome: PASS.**

## Live verification

Confirmed via live Playwright screenshots at 360/768/1280px: Booking Policies tab shows the redirect banner and 4 remaining real fields (no Cancellation Policy/Late Fee controls); clicking "Go to Cancellation Rules" correctly switches to the real Cancellation Rules tab.

## Browser e2e (Playwright)

`npx playwright test e2e/admin-policies-communications.spec.js --workers=1` — 2/2 passing. Found and fixed a real, pre-existing race unrelated to this change while investigating a flake under concurrent load: the Slot Buffer field's `fill()` could be clobbered back to its loaded default if `GetOrgBookingPolicies`'s network response resolved after the fill — fixed by waiting on the actual response in the test.

## Lint

`npx eslint src/pages/admin/Policies.jsx e2e/admin-policies-communications.spec.js` — 0 errors (pre-existing unrelated warnings only).
