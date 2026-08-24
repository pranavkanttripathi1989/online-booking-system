---
id: TR091
type: requirement
feature: appointments
created: 2026-08-24
updated: 2026-08-24
status: pass
parent: TP092
related: [REQ018, PLAN065]
---

# TR091 — Results: prepayment policy + booking widget config

Executed 2026-08-24 as part of a consolidated verification pass covering
all 8 requirement slices in this session's second batch together (backend
unit + integration suites, eslint, tsc all run once across the combined
changeset, per the same "implement all slices first, verify once"
discipline validated in the prior 5-slice pass).

| Case | Result | Evidence |
|---|---|---|
| TC-01 | pass | `creates with status "scheduled" when the service has no prepayment requirement (default)` |
| TC-02 | pass | `creates with status "awaiting_payment" when the service requires prepayment` + `logs the same initial status on AppointmentStatusLogs` |
| TC-03 | pass | `fires an appointment.created webhook event for the booking clinic's org` |
| TC-04 | pass | `is a no-op for an org-less caller` — this test caught a **real design bug**: my first implementation of the webhook-firing code did an unconditional `clinics.findUnique` fetch for every booking (to resolve the org id), which broke this pre-existing call-count assertion. Fixed by using the caller's own JWT `client_org_id` directly instead of an extra fetch — also a genuine efficiency win (no new query on the hot booking path), and a deliberate, documented scope limit: a platform operator booking on a tenant's behalf (no org of their own) does not fire that tenant's webhook in this slice. |
| TC-05 | pass | `fires an appointment.cancelled webhook event, but only on an actual cancel, not a completing transition` |
| TC-06 | pass | `confirms an awaiting_payment appointment and fires appointment.confirmed + payment.succeeded webhooks` |
| TC-07 | pass | `is a no-op on an already-confirmed appointment` |
| TC-08 | pass | `accepts a split across multiple tenders that sums exactly` (pre-existing `recordCounterPayment` test) continues to pass with `confirmAppointmentIfAwaitingPayment` wired in — no regression |
| TC-09 | pass | `passes prepayment_policy through untouched` |
| TC-10–TC-16 | pass | Full `booking-widget.service.spec.ts` suite (8 tests). **A real bug found and fixed**: TC-12 (`create` with a cross-org `clinic_id`) initially threw an unhandled `BadRequestException` instead of returning the graceful `{success:false, userErrors}` shape `BookingWidgetMutationResultType` promises — `assertClinicInScope` throws by convention (matching `departments.service.ts`), but nothing caught it before it reached the GraphQL layer for this domain's wrapped-response type. Fixed by wrapping the Hard-Rule-6 check in `create()`/`update()` with a try/catch that translates the thrown message into the graceful shape. |
| TC-17 | pass | New `booking-widget` domain-case — `matrix-coverage.int-spec.ts` + `tenancy.int-spec.ts` both green |
| TC-18 | pass | Live-verified: created a real service with `prepayment_policy: 'required'`, booked it via `createAppointment` as a staff caller — appointment landed at `status: 'awaiting_payment'`; closed it via `recordCounterPayment` with a matching cash tender — appointment transitioned to `'confirmed'`, `AppointmentStatusLogs` gained a `'confirmed'`/`'Prepayment received'` row, confirming the full REQ018+REQ030+REQ023 chain works end-to-end against the real backend, not just mocks |
| TC-19 | pass | `npx tsc --noEmit` — clean across the full 8-slice combined changeset |
| TC-20 | pass | `npx eslint "{src,apps,libs,test}/**/*.ts"` — 0 errors (found and fixed 5 unused-import errors across the new modules before this run) |
| TC-21 | pass | `npm test` — 73/73 suites, 1053/1053 tests (consolidated run across all 8 slices) |
| TC-22 | pass | `npm run test:int` — 4/4 suites, 315/315 tests (consolidated run, includes the 7 new tenancy-matrix domain-cases this pass added) |

## Live verification (2026-08-24, follow-up)

The backend container recovered after a full Docker Desktop restart (see
`TR092`'s environment note). Live-tested the **full REQ018+REQ030+REQ023
chain together** against real dev-seeded data, as `manager@medibook.dev`:

1. Set the real "GP Consultation" service (₹499) to `prepayment_policy:
   'required'`.
2. Registered a real `WebhookEndpoint` subscribed to `appointment.created`.
3. `createAppointment` for a real patient (Anita Sharma) with a real
   clinician (Sarah Mitchell) — the appointment landed at `status:
   'awaiting_payment'` exactly as designed, not `'scheduled'`.
4. `webhookDeliveryLog` showed a real `appointment.created` delivery
   attempt (`status: 'failed'`, since the test endpoint pointed at a
   non-resolving domain) — confirming the event fires and a failed
   delivery is logged, not silently swallowed or thrown, matching
   `TR095`'s unit-level assertion of the same behaviour.
5. `recordCounterPayment` for the full ₹499 as cash — succeeded, returned
   a real gapless invoice number.
6. Re-queried the appointment: `status: 'confirmed'` — the full
   `awaiting_payment → confirmed` transition fired for real, from a real
   walk-in payment, not just a mocked test.

Reverted the shared "GP Consultation" service back to `prepayment_policy:
'none'` afterward. This is the strongest available evidence (short of a
real Razorpay checkout, not exercised) that the entire cross-cutting
prepayment/webhook/counter-payment design works end-to-end, not just at
the unit level.

## A second real bug found while writing this pass's tests

Not scoped to this slice specifically but found while wiring the new
domains' unit tests: `common/scoping/tenant-scope.ts`'s
`isPlatformOperator()` treats every `admin`/`super_admin` caller as
platform-wide *unconditionally*, regardless of their own `client_org_id`.
Two new resolvers (`webhooks`, `api-keys`) were initially gated to
`admin`/`super_admin` only, which made their own `isSameOrg()` cross-tenant
rejection checks unreachable dead code — the only callers who could ever
reach those checks were always treated as allowed to see every org. Fixed
by widening both resolvers' `@Auth()` to include `manager` (this schema's
real org-scoped top role, the same gate `departments`/`services`/
`insurance` already use) — see `TR095`/`TR097` for the domain-specific
detail.
