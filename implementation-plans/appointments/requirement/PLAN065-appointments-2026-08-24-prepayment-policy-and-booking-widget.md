---
id: PLAN065
type: requirement
feature: appointments
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ018
related: [REQ018, PLAN059]
---

# PLAN065 — Implementation plan: per-service prepayment policy + embeddable booking widget config

## Scope

The two P0 stories `PLAN059` deliberately deferred: `US-BOOK-03`
(per-service prepayment policy) and the config/allowlist half of
`US-BOOK-05` (embeddable booking widget). Not in scope: intake
customization (`US-BOOK-06`, P1) or auto-no-show (`US-BOOK-04`, P1).

## Design

### Prepayment policy (US-BOOK-03)

`Products.prepayment_policy` (`required | optional | none`, default
`'none'` — preserves today's behaviour exactly for every existing
service). `appointments.service.ts`'s `create()` already fetches the
`Products` row for duration; reused, not re-fetched, to decide the
appointment's initial `status`: `'awaiting_payment'` when
`prepayment_policy === 'required'`, `'scheduled'` otherwise (`optional`
behaves like `none` in this slice — no distinct "payment nudged but not
blocking" UX built yet, logged as open).

`AppointmentPaymentsService` gains one shared private method,
`confirmAppointmentIfAwaitingPayment(appointmentId)`, mirroring
`invoiceDetailsForSuccess`'s own "called from both `verifyRazorpayPayment`
and the webhook's `payment.captured` branch" shape — a no-op unless the
appointment is currently `'awaiting_payment'`. Wired into all three real
payment-success paths: `verifyRazorpayPayment`, the webhook handler, and
`recordCounterPayment` (`REQ023`) — a prepayment-required service paid at
the counter must confirm exactly the same way as one paid online.

### Embeddable booking widget (US-BOOK-05)

Confirmed via code reading before designing: `booking/index.jsx` already
renders chrome-free for an anonymous caller (`OptionalAuthShell`, `BUG011`'s
own fix) and already reads a clinician id from its query params — an
iframe embed needs zero changes to that page. This slice is only the
allowlist/slug an org admin manages: `BookingWidgetConfig`
(`allowed_origins` JSON array, a globally-unique `short_link_slug`,
optional `clinic_id`). New `backend/src/booking-widget/` module, same
shape as `departments/` (own `client_org_id`, Hard-Rule-6 clinic-scope
check on create/update). `isOriginAllowed(slug, origin)` exists for a
future slice's server-verified embed token — not called by anything yet,
since no server-side origin check exists in the embed path today (browsers
already enforce `X-Frame-Options`/CSP `frame-ancestors` at the HTTP layer
for the underlying page).

## Files touched

- `backend/prisma/schema.prisma` — `Products.prepayment_policy`;
  new `BookingWidgetConfig` model (part of this session's combined
  `20260825010000_req_batch2_eight_slices` migration, covering all 8
  slices built in this pass — see that migration's own header comment).
- `backend/src/appointments/appointments.service.ts` — `create()`'s
  `initialStatus` derivation; `WebhookDispatchService` injected (REQ030,
  same slice) fires `appointment.created`/`appointment.cancelled`.
- `backend/src/appointment-payments/appointment-payments.service.ts` —
  `confirmAppointmentIfAwaitingPayment()`, wired into all three success paths.
- `backend/src/services/{dto/service.input.ts,entities/service.entity.ts,services.service.ts}` —
  `prepayment_policy` field, pass-through only (Prisma `undefined` leaves
  the default alone).
- `frontend/src/graphql/{queries,mutations}.js` — `prepayment_policy` on
  `SERVICE_DETAIL_QUERY`/`CREATE_SERVICE_MUTATION`/`UPDATE_SERVICE_MUTATION`.
- `frontend/src/pages/manager/services/{create,edit}.jsx` — a "Prepayment
  policy" `Select` (None/Optional/Required) in the Service Details panel.
- `backend/src/booking-widget/` (new module) — `module/resolver/service`,
  `dto/booking-widget.input.ts`, `entities/booking-widget.entity.ts`.
- No frontend admin page for `BookingWidgetConfig` in this slice — the
  GraphQL CRUD surface is real and tested; an "Embed Code" admin UI is
  deliberately deferred, logged as open rather than built thin/untested
  under this pass's time budget.

## GraphQL contract

New: `Service.prepayment_policy: String!`, `ServiceInput.prepayment_policy: String`
(both dialects match the existing `ServiceInput`/`ServiceType` canonical
shape exactly — no new convention). New:
`bookingWidgetConfigs`/`bookingWidgetConfig(id)` queries,
`createBookingWidgetConfig`/`updateBookingWidgetConfig`/
`deactivateBookingWidgetConfig` mutations, all returning
`BookingWidgetMutationResultType` (`{success, userErrors, config}` — the
wrapped-response convention, matching `DepartmentMutationResultType`'s
precedent for a domain with meaningful partial-failure semantics).

## Test plan

See `TP092`.

## Test results

See `TR091`.
