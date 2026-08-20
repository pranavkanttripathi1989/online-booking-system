---
id: TP041
type: requirement
feature: communications-policies
created: 2026-08-20
updated: 2026-08-20
status: approved
parent: REQ006
related: [PLAN011]
---

# Test plan — Booking Policies + Communication (Email) Settings (REQ006/PLAN011)

## Unit tests (`backend/src/org-settings/org-settings.service.spec.ts`, 8 cases)

Platform-wide caller gets `null` from both queries without a DB round-trip; queries scope strictly to the caller's own org id; `no_show_fee_paise` converts to rupees on read; platform-wide caller's mutation attempts rejected with a clear message, not a DB error, for both communication settings and booking policies; update scoped to the caller's own org row only; rupees convert back to paise on write; DB error returns `{success:false}` rather than throwing.

## Live e2e verification (real backend, authenticated GraphQL, `manager@medibook.dev` and `admin@medibook.dev`)

1. Both queries return real defaults matching the mock UI's hardcoded values exactly.
2. Both mutations round-trip an update and are reverted.
3. A platform-wide caller (`admin@medibook.dev`) attempting `updateMyOrgBookingPolicies` is cleanly rejected — confirms the routing fix (below) is necessary and correctly paired with resolver-level self-scoping, not a substitute for it.

## Browser e2e (Playwright, `frontend/e2e/admin-policies-communications.spec.js`)

- Manager can now reach `/admin/policies` and `/admin/communications` at all — these routes were `admin`/`super_admin`-only before this pass, which made the org-scoped backend unreachable by its only viable caller (see PLAN011's routing-bug section).
- Manager edits and saves a real Slot Buffer value on the Booking Policies tab; persists across reload; reverted within the test.
- Manager edits and saves a real From Name on the Communications Global Settings tab; persists across reload; reverted within the test.
- One flaky-test fix during authoring: an intermediate `toHaveValue` assertion was needed between `.fill()` and the Save click to avoid a genuine timing race between React's controlled-input state commit and the click firing — confirmed via direct backend calls that the persistence itself was never actually broken, only the test's own timing.

## Non-goals for this plan

SMS Settings (provider/API-key), Cancellation Policy/Late Fee sliders, Notification Templates tab, Send Test Message tab — all logged as open questions or already-known blockers, not guessed at.
