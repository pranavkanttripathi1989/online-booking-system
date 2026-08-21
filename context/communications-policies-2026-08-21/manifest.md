---
feature: communications-policies
date: 2026-08-21
ids: [REQ010, PLAN019, TP048, TR047]
status: done
---

# communications-policies — 2026-08-21

Resolves `context/open-questions.md` #7, logged while scoping REQ006's remaining tabs. `admin/Policies.jsx`'s Booking Policies tab had a Cancellation Policy + Late Fee slider pair that duplicated the real, already-shipped Cancellation Rules tab (per-clinic or global, priority-ordered) — a second, non-persisted, disabled-with-a-caption version of the same real-world setting.

Resolved by explicit user direction: redirect, don't duplicate. Removed the two sliders entirely; added an info banner with a button that switches to the real Cancellation Rules tab. No backend change — the removed fields were never wired to a mutation.

Found and fixed a real, pre-existing (unrelated) race in `frontend/e2e/admin-policies-communications.spec.js` while investigating a flake: `GetOrgBookingPolicies`'s network response could resolve after the test's own field edit, silently clobbering it back to the loaded default.

## Requirement

- [REQ010 — Remove duplicate Cancellation Policy sliders](../../requirements/communications-policies/improvement/REQ010-communications-policies-2026-08-21-remove-cancellation-policy-duplication.md) — done

## Implementation plan

- [PLAN019 — Remove duplicate Cancellation Policy sliders](../../implementation-plans/communications-policies/improvement/PLAN019-communications-policies-2026-08-21-remove-cancellation-policy-duplication.md) — done

## Test plan

- [TP048 — Remove duplicate Cancellation Policy sliders](../../test-plans/communications-policies/improvement/TP048-communications-policies-2026-08-21-remove-cancellation-policy-duplication.md) — approved

## Test results

- [TR047 — Remove duplicate Cancellation Policy sliders](../../test-results/communications-policies/improvement/TR047-communications-policies-2026-08-21-remove-cancellation-policy-duplication.md) — passed
