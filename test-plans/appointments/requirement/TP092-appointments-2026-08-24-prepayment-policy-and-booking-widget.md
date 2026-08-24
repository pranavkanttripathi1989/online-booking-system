---
id: TP092
type: requirement
feature: appointments
created: 2026-08-24
updated: 2026-08-24
status: approved
parent: REQ018
related: [PLAN065]
---

# TP092 — Test plan: prepayment policy + booking widget config

Direct test-plan against a routine additive extension of already-proven
patterns (Departments' own scaffolding, the existing payment-success call
sites) — suggestion stage skipped per `CLAUDE.md`'s working loop step 4.

## Unit — `appointments.service.spec.ts`

| Case | Given | When | Then |
|---|---|---|---|
| TC-01 | A service with `prepayment_policy: 'none'` (default) | `create()` | Appointment status `'scheduled'`, unchanged from today |
| TC-02 | A service with `prepayment_policy: 'required'` | `create()` | Appointment status `'awaiting_payment'`; `AppointmentStatusLogs` logs the same status |
| TC-03 | Any booking | `create()` | `appointment.created` webhook fires for the booking clinic's org |
| TC-04 | An org-less caller (patient self-serve via this internal mutation) | `create()` | No extra `clinics.findUnique` call, no webhook fired — matches the pre-existing "no-op for org-less caller" call-count assertion |
| TC-05 | An appointment cancelled | `cancel()` | `appointment.cancelled` webhook fires; `complete()` does not fire it |

## Unit — `appointment-payments.service.spec.ts`

| Case | Given | When | Then |
|---|---|---|---|
| TC-06 | Appointment status `'awaiting_payment'` | `verifyRazorpayPayment` succeeds | Status → `'confirmed'`, a matching `AppointmentStatusLogs` row, `appointment.confirmed` + `payment.succeeded` webhooks both fire |
| TC-07 | Appointment already `'confirmed'` | Same payment success path | No-op — never re-confirms, never re-fires |
| TC-08 | A prepayment-required appointment paid via `recordCounterPayment` (walk-in) | Counter payment succeeds | Same confirm-and-fire behaviour as the Razorpay path — a prepayment-required service confirms identically regardless of how it's paid |

## Unit — `services.service.spec.ts`

| Case | Given | When | Then |
|---|---|---|---|
| TC-09 | `create()`/`update()` with `prepayment_policy` supplied vs. omitted | Pass-through | Supplied value forwarded verbatim; omitted leaves the Prisma call's field `undefined` (schema default applies on create, existing value untouched on update) |

## Unit — `booking-widget.service.spec.ts`

| Case | Given | When | Then |
|---|---|---|---|
| TC-10 | `findAll` | Tenant caller vs. platform operator | Scoped to caller org vs. unscoped, matching the Departments precedent |
| TC-11 | `findOne` on a cross-org config | | Rejected `NotFoundException` |
| TC-12 | `create` with a `clinic_id` belonging to a different org | | Returns `{success:false}` gracefully (not an unhandled throw — a real bug found and fixed while writing this test, see `TR091`) |
| TC-13 | `create` for an org-less platform operator | | Returns `{success:false}` (cannot stamp `client_org_id`) |
| TC-14 | `create` with no `short_link_slug` supplied | | A random slug is generated; a collision against an existing slug retries once |
| TC-15 | `deactivate` a cross-org config | | Returns `{success:false}`, never calls `update` |
| TC-16 | `isOriginAllowed` | Inactive config / allowlisted origin / non-allowlisted origin | `false` / `true` / `false` respectively |

## Integration — tenancy matrix

| Case | Given | When | Then |
|---|---|---|---|
| TC-17 | New `booking-widget` domain-case, own `client_org_id`, fixture rows per org | `matrix-coverage.int-spec.ts` + `tenancy.int-spec.ts` | Both pass; role-gated to `manager`/`admin`/`super_admin` |

## Live verification against the real dev stack

| Case | Given | When | Then |
|---|---|---|---|
| TC-18 | A real service set to `prepayment_policy: 'required'` | Book it via `createAppointment` as staff | Appointment created with status `awaiting_payment`, confirmed by a subsequent `recordCounterPayment` call |

## Static / build gates

| Case | Command | Expected |
|---|---|---|
| TC-19 | `npx tsc --noEmit` | Clean |
| TC-20 | `npx eslint "{src,apps,libs,test}/**/*.ts"` | 0 errors |
| TC-21 | `npm test` (full suite) | All green |
| TC-22 | `npm run test:int` | All green |
