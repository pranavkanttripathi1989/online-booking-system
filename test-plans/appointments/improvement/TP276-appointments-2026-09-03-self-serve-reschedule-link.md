---
id: TP276
type: improvement
feature: appointments
created: 2026-09-03
updated: 2026-09-03
status: approved
parent: PLAN256
related: [REQ187]
---

# TP276 — Test plan: self-serve reschedule link (P2-16)

Suggestion stage skipped: full technical design (token lifecycle, the
"don't invalidate a still-live earlier link" constraint, the
`reminder_count` reset bug-fix, the shared fee-computation extraction) was
reviewed and approved via `ExitPlanMode` before any code was written.

## `AppointmentsService#issueRescheduleToken`

| # | Case | Expected |
|---|---|---|
| 1 | No existing token on the row | Mints and persists a fresh one, returns the raw value |
| 2 | A still-valid, unused token already exists | Returns `null`, mints nothing — the earlier link keeps working |
| 3 | The existing token is already used | Mints a fresh one |
| 4 | The existing token has expired | Mints a fresh one |

## `AppointmentsService#getRescheduleContext`

| # | Case | Expected |
|---|---|---|
| 5 | Unknown token | Rejected as "not found," no existence confirmation |
| 6 | Valid token | Returns clinician/service/current-time/`booking_mode` |
| 7 | Already-used token | Rejected, distinct message from "not found" |
| 8 | Expired token | Rejected, distinct message from "already used" |
| 9 | Token for a cancelled appointment | Rejected |

## `AppointmentsService#reschedulePublic`

| # | Case | Expected |
|---|---|---|
| 10 | Any client-supplied appointment id | Never trusted — only the token hash resolves the row |
| 11 | Already-used / expired token | Rejected before any write |
| 12 | New time in the past | Rejected |
| 13 | Slot no longer free (`assertSlotFree`) | Rejected, no write |
| 14 | Successful reschedule | Token marked used atomically with the write; `reminder_count`/`reminder_sent_at` reset |
| 15 | Successful reschedule | `AppointmentResources` time range synced to the new slot |
| 16 | Successful reschedule | Status log entry has `changed_by_user_id: null` |
| 17 | Short notice + a matching fee rule | Same fee logic `update()` uses, applied identically |

## `AppointmentsService#update` — regression coverage

| # | Case | Expected |
|---|---|---|
| 18 | A staff-initiated reschedule (`start_datetime` changes) | `reminder_count`/`reminder_sent_at` reset too |
| 19 | `start_datetime` unchanged | Neither field touched |

## `AppointmentReminderSweepService`

| # | Case | Expected |
|---|---|---|
| 20 | A reminder is dispatched | A token is minted and the message includes the `/reschedule/<token>` link |
| 21 | `issueRescheduleToken` returns `null` (a live link already exists) | The message has no reschedule line at all |
| 22 | Patient has no linked login account | `issueRescheduleToken` is never called — nothing is sent to carry it |

## Live-only checks (not meaningfully unit-testable)

- Container restart + GraphQL introspection confirming both new public
  operations are genuinely served.
- Full integration suite, including the pre-existing `appointments`
  tenancy-matrix row in `matrix-coverage.int-spec.ts` — confirms this
  same-domain addition didn't regress the domain's already-proven
  cross-tenant guarantee.

## Frontend

| # | Case | Expected |
|---|---|---|
| 23 | Invalid token | The real backend message shown, not a generic one |
| 24 | Non-slot-mode appointment | "Please contact the clinic" message, no picker |
| 25 | Valid token | Current-appointment summary rendered |
| 26 | A booked slot | Shown disabled, not hidden (`BOOK-6`) |
| 27 | Successful reschedule | New time shown |
| 28 | Successful reschedule with a fee | Fee amount shown via `formatCurrency` |
| 29 | A real slot-conflict error on submit | Shown, picker still usable — not a dead end |
| 30 | The idle/error states | Zero axe-core violations |
