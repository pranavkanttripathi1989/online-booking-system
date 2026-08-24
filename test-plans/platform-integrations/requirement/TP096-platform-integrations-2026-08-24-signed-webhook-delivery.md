---
id: TP096
type: requirement
feature: platform-integrations
created: 2026-08-24
updated: 2026-08-24
status: approved
parent: REQ030
related: [PLAN069]
---

# TP096 — Test plan: signed outbound webhook delivery

Direct test-plan; suggestion stage skipped per `CLAUDE.md` step 4.

## Unit — `webhooks.service.spec.ts`

| Case | Given | When | Then |
|---|---|---|---|
| TC-01 | `findAll` | | Never returns the raw `secret` (GraphQL type omits it, `toGraphQL` strips it) |
| TC-02 | `create` | | Stores the *encrypted* secret, not the raw one; the raw secret is returned exactly once in the mutation result |
| TC-03 | A cross-org endpoint | `deactivate` / `deliveryLog` | Both rejected |

## Unit — `webhook-dispatch.service.spec.ts`

| Case | Given | When | Then |
|---|---|---|---|
| TC-04 | An org with no active endpoint at all | `fireEvent` | No-op, no delivery log row |
| TC-05 | An endpoint not subscribed to this event type | `fireEvent` | No-op |
| TC-06 | A subscribed, reachable endpoint | `fireEvent` | POSTs a signed payload (`X-MediBook-Signature`); logs `status: 'succeeded'` on a 2xx response |
| TC-07 | An unreachable endpoint | `fireEvent` | Logs `status: 'failed'`, **never throws** — a delivery failure must not break the caller's own flow |

## Unit — `appointments.service.spec.ts` / `appointment-payments.service.spec.ts` (wiring)

| Case | Given | When | Then |
|---|---|---|---|
| TC-08 | Any booking | `create()` | `appointment.created` fires for the booking clinic's org |
| TC-09 | A cancellation | `cancel()` | `appointment.cancelled` fires; `complete()` does not fire it |
| TC-10 | A payment success (any of the 3 real paths) | | `payment.succeeded` fires; `appointment.confirmed` fires only when the appointment was `awaiting_payment` |

## Integration — tenancy matrix

| Case | Given | When | Then |
|---|---|---|---|
| TC-11 | New `webhooks` domain-case (`webhookEndpoints`), fixture endpoints per org | `matrix-coverage.int-spec.ts` + `tenancy.int-spec.ts` | Both pass; role-gated to `manager`/`admin`/`super_admin` (see `PLAN069`'s own real-finding note on why `manager` had to be included) |

## Static / build + full-suite gates

| Case | Command | Expected |
|---|---|---|
| TC-12 | `npx tsc --noEmit` | Clean |
| TC-13 | `npx eslint` | 0 errors |
| TC-14 | `npm test` | All green |
| TC-15 | `npm run test:int` | All green |
