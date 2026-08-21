---
id: REQ010
type: improvement
feature: communications-policies
created: 2026-08-21
updated: 2026-08-21
status: done
parent: null
related: [PLAN019, TP048, TR047]
---

# admin/Policies.jsx — remove duplicate Cancellation Policy / Late Fee sliders

**Why this exists:** resolves `context/open-questions.md` #7, logged while scoping REQ006's remaining Booking Policies tabs. The tab's `POLICIES` array had a "Cancellation Policy" (hours) + "Late Cancellation Fee" (₹) pair that conceptually duplicated the real, already-shipped Cancellation Rules tab (per-clinic or global, priority-ordered, `hours_before`/`fee_type`/`fee_amount`) — a second, parallel single-value setting for the same real-world policy, never actually persisted to a backend (already flagged and disabled in the UI with an explanatory caption before this fix).

**Decision (this session):** redirect, don't duplicate — remove the two sliders entirely; the Booking Policies tab now points to the real Cancellation Rules tab instead of offering a second, non-functional version of the same setting.

## Scope

- `POLICIES` array: removed the `cancellation`/`lateFee` entries. The remaining four (No-Show Fee, Slot Buffer Time, Max Reschedules/Month, Data Retention Period) are unaffected — they were already real, backend-persisted fields and don't overlap with Cancellation Rules.
- Booking Policies tab: added an info banner ("Looking for cancellation policy or fees? That's managed on the Cancellation Rules tab now...") with a button that switches directly to the Cancellation Rules tab.
- No backend change — the removed fields were never wired to a mutation to begin with.

## Acceptance criteria

- No page anywhere offers two different UIs for the same cancellation-fee concept.
- A user looking for cancellation policy on the Booking Policies tab is pointed to the real one, not left to guess it moved.
