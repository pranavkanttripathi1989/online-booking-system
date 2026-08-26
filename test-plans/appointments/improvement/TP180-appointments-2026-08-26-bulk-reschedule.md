---
id: TP180
type: improvement
feature: appointments
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN160
related: []
---

# TP180 — Test plan: bulk-reschedule a clinician's day

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | Zero shift rejected | `shift_minutes: 0` | Rejected before any query |
| 2 | Cross-org clinician rejected | Clinician in a different org | `NotFoundException` |
| 3 | Correct per-row shift + honest count | 2 scheduled appointments, shift +60 | Both shift by exactly 60 minutes; `{attempted_count: 2, rescheduled_count: 2, failed_count: 0}` |
| 4 | Scope: scheduled/confirmed + single day only | Query assertion | `where.status = {in: ['scheduled','confirmed']}`, `appointment_time` bounded to the given UTC day |
| 5 | Per-row conflict counted as a failure, batch continues | First row's `assertSlotFree` finds a conflict, second doesn't | `{attempted_count: 2, rescheduled_count: 1, failed_count: 1}` |
| 6 | Session/hybrid rows skip the slot-conflict check | `booking_mode: 'session'` | `assertSlotFree` never called |
| 7 | Frontend dialog | `pages/appointments/index.jsx` | "Bulk Reschedule" button disabled with no clinician selected; enabled once one is; dialog collects day + shift, calls the mutation, shows a result snackbar |
| 8 | Full suite regression | Backend unit + integration | 92/92 / 1470/1470; integration 4/4 / 387/387 unchanged |
| 9 | Lint/typecheck clean | backend + frontend touched files | 0 errors |
