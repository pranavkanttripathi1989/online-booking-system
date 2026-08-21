---
id: TP048
type: improvement
feature: communications-policies
created: 2026-08-21
updated: 2026-08-21
status: approved
parent: REQ010
related: [PLAN019]
---

# Test plan — remove duplicate Cancellation Policy sliders (REQ010/PLAN019)

## Live verification (real backend, Playwright/Chromium)

1. Booking Policies tab no longer offers "Cancellation Policy"/"Late Cancellation Fee" controls.
2. A redirect banner is visible, with a button that switches to the real Cancellation Rules tab.
3. The 4 remaining real fields (No-Show Fee, Slot Buffer Time, Max Reschedules/Month, Data Retention Period) are unaffected — still load real values and save correctly.

## Browser e2e (Playwright)

`frontend/e2e/admin-policies-communications.spec.js` — re-run against the changed page, confirmed still green; extended to wait on the real `GetOrgBookingPolicies` network response before interacting with the Slot Buffer field, fixing a real (pre-existing, unrelated to this change) race that surfaced under concurrent test load.

## Responsive check

360px/768px/1280px — banner and remaining policy cards render cleanly, no overflow.
