---
id: PLAN019
type: improvement
feature: communications-policies
created: 2026-08-21
updated: 2026-08-21
status: done
parent: REQ010
related: [TP048, TR047]
---

# Implementation plan — remove duplicate Cancellation Policy sliders (REQ010)

## Frontend (`admin/Policies.jsx`)

- Removed the `cancellation`/`lateFee` entries from the `POLICIES` array (previously rendered disabled with an "unbacked" caption).
- Simplified the Booking Policies tab's render — dropped the now-dead `isUnbacked` branching (every remaining policy row is real and enabled).
- Added an `Alert` banner above the policy cards with a "Go to Cancellation Rules" action button (`onClick={() => setTab(3)}`) pointing at the real, already-shipped Cancellation Rules tab in the same page.

No backend change — the removed fields were local-only display state, never wired to a mutation.

## Verification

- Live Playwright check: Booking Policies tab renders the banner + 4 remaining real fields; clicking "Go to Cancellation Rules" switches to the real tab.
- Existing `frontend/e2e/admin-policies-communications.spec.js` re-run and confirmed still green (no references to the removed fields existed). Also found and fixed a real, pre-existing (unrelated) race in that same spec while investigating a flake: `GetOrgBookingPolicies`'s network response could resolve after the test's `fill()`, and the resulting `setPolicies()` would silently clobber the just-typed value back to the loaded default — fixed by waiting on the actual network response instead of just a static label's visibility.
- Responsive check at 360/768/1280px: clean, no overflow.
