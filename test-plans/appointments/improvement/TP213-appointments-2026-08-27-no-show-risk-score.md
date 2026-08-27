---
id: TP213
type: improvement
feature: appointments
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ152
related: [REQ152, PLAN193, TR213]
---

# TP213 — Test plan: no-show risk score (P1-17)

Well-scoped against an already-proven pattern (REQ052's own prepayment
mechanism, `NoShowSweepService`'s own cron shape). Suggestion stage
skipped per `CLAUDE.md`'s own conditional rule; drafted directly.

## Backend unit

| # | Case | Module |
|---|---|---|
| 1–9 | Score scaling (proportional, not binary), org-threshold respect, lead-time factors (far-out/same-day), self-booked channel factor, capping at 0/100 | `no-show-risk.spec.ts` |
| 10–17 | REQ052's own 3 pre-existing prepayment tests pass unmodified; a self-booked far-out booking forced into prepayment below the raw threshold; a clean-history staff-booked booking never forced regardless of lead time; `no_show_risk` exposed and live-computed on `findOne` | `appointments.service.spec.ts` |
| 18–28 | Standard/early reminder windows, intensity by risk level (1 vs 2 reminders), never double-sent, per-row failure isolation, unlinked-patient no-op (still marks sent), only queries confirmed/non-deleted, ignores past appointments | `appointment-reminder-sweep.service.spec.ts` |

## Backend integration (real Postgres + real GraphQL guard chain)

| # | Case |
|---|---|
| 1 | Clean-history patient, near-term slot → not forced into prepayment |
| 2 | Real no-show history, self-booked, far-out slot → forced into `awaiting_payment` |
| 3 | `no_show_risk` on a read reflects the patient's *current* history, not what it was at booking time |

## Frontend unit

| # | Case | File |
|---|---|---|
| 1 | High-risk chip shows its own icon, not colour alone (A11Y-3) | `appointments/index.test.jsx` |
| 2 | Low-risk chip shows a distinct icon | same |
| 3 | Real risk reasons surfaced in a tooltip | same |
| 4 | Normal confirmed booking still shows the real success screen | `BookingStep5Confirm.test.jsx` |
| 5 | A booking that lands `awaiting_payment` never shows the success screen | same |
| 6 | Risk-driven prepayment explains the real reasons | same |
| 7 | "Collect Payment Now" navigates to the real Take Payment action | same |

## Out of scope for this test plan

- Automated overbook-allowance adjustment (deliberately not built this
  slice — see `REQ152`'s own scope-cut note).
- A real accuracy benchmark for the risk weights (no labeled outcome
  dataset in this environment).
