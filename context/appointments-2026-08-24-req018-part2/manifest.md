---
id: CTX-appointments-2026-08-24-req018-part2
type: requirement
feature: appointments
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ018
related: [PLAN065, TP092, TR091]
---

# appointments — REQ018 slice 2: prepayment policy + booking widget config (2026-08-24)

First of eight requirement slices picked and built in this session's
second pass (REQ018 → REQ032 → REQ034 → REQ022 → REQ030 → REQ031 → REQ015
→ REQ029), following the same "implement all slices' code first, verify
once at the end" workflow the prior 5-slice pass validated.

## Documents

| Root | ID | Doc |
|---|---|---|
| implementation-plans | PLAN065 | [prepayment policy + booking widget config](../../implementation-plans/appointments/requirement/PLAN065-appointments-2026-08-24-prepayment-policy-and-booking-widget.md) |
| test-plans | TP092 | [verification plan](../../test-plans/appointments/requirement/TP092-appointments-2026-08-24-prepayment-policy-and-booking-widget.md) |
| test-results | TR091 | [verification results — pass](../../test-results/appointments/requirement/TR091-appointments-2026-08-24-prepayment-policy-and-booking-widget.md) |

## What shipped

- `Products.prepayment_policy` (`required|optional|none`) — a service
  configured "required" leaves its booking at `status: 'awaiting_payment'`
  until a real payment succeeds (Razorpay or counter payment), via a new
  shared `confirmAppointmentIfAwaitingPayment()` wired into all three real
  payment-success paths.
- `BookingWidgetConfig` — the allowlist/slug half of the embeddable
  booking widget. `booking/index.jsx` itself needed zero changes (confirmed
  via code reading: `BUG011`'s fix already makes it render chrome-free and
  clinician-id-aware for an anonymous caller).
- Real findings, both from writing this slice's own tests: a call-count
  regression from an unconditional extra DB fetch (fixed by reusing the
  caller's JWT org instead), and an unhandled-throw vs. graceful-`{success:
  false}` inconsistency in `BookingWidgetService.create()`.

## Closes REQ018

All four of `REQ018`'s own P0 stories are now shipped across two
same-day passes (`PLAN059` + `PLAN065`).

## Next in this pass

REQ032 (subscription plan engine — plan builder data model).
