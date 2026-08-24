---
id: PLAN069
type: requirement
feature: platform-integrations
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ030
related: []
---

# PLAN069 — Implementation plan: signed outbound webhook delivery

## Scope

`US-INT-02` scoped down: signed webhook payloads for real domain events,
delivery logged for visibility. Explicitly deferred (this story's own P1
acceptance criterion): exponential-backoff retry — no new queue/worker
infra added this slice. `US-INT-03` (second payment gateway), `US-INT-04`
(Tally/Zoho export), and the public REST API itself are untouched.

## Design

`WebhookEndpoints` (client_org_id, url, `secret` — AES-256-GCM encrypted
via `common/crypto/secrets.ts`, the same helper already used for OTP
provider credentials, never stored plaintext — `event_types_json`) +
`WebhookDeliveryLog` (endpoint_id, event_type, payload_json, status,
http_status, response_snippet) for every attempt's outcome, whether it
succeeded or failed.

`WebhookDispatchService.fireEvent(clientOrgId, eventType, payload)` is a
separate service from the CRUD `WebhooksService`, exported for other
modules to inject directly — deliberately not routed through
`NotificationTriggerService.dispatch()` (that method is keyed by a
`userId` for preference lookup; a webhook has no per-user recipient
concept, it's an org-level subscription). Delivery is synchronous/
best-effort: a plain `fetch()` POST (no new HTTP-client convention — the
same global `fetch` `createRazorpayOrder` already uses), HMAC-SHA256 over
the JSON body using the endpoint's own decrypted secret
(`X-MediBook-Signature` header), the response logged regardless of outcome
and never thrown back at the caller that triggered the event — a webhook
delivery failure must never break the appointment/payment flow that
caused it.

Wired into three real event points, matching the event vocabulary already
established by `NotificationTriggerService`'s own `dispatch()` calls where
sensible: `appointment.created`/`appointment.cancelled`
(`appointments.service.ts`), `appointment.confirmed`/`payment.succeeded`
(`appointment-payments.service.ts`, at all three of its real
payment-success paths — Razorpay verify, the webhook handler, and
`recordCounterPayment`).

A real efficiency/correctness decision made while wiring this in: the
event-firing code uses the caller's own JWT `client_org_id` directly
rather than an extra `clinics.findUnique` fetch, since the org-boundary
check earlier in the same method already establishes it — see `TR091`'s
own account of the pre-existing test this caught.

## Files touched

- `backend/prisma/schema.prisma` — new `WebhookEndpoints`,
  `WebhookDeliveryLog` models.
- `backend/src/webhooks/` (new module) — `webhooks.module.ts`,
  `webhooks.service.ts` (CRUD), `webhook-dispatch.service.ts` (the
  delivery mechanism, exported separately), `webhooks.resolver.ts`,
  `dto/webhook.input.ts`, `entities/webhook.entity.ts`.
- `backend/src/appointments/{appointments.module.ts,appointments.service.ts}` —
  imports `WebhooksModule`, fires `appointment.created`/`.cancelled`.
- `backend/src/appointment-payments/{appointment-payments.module.ts,appointment-payments.service.ts}` —
  imports `WebhooksModule`, fires `appointment.confirmed`/`payment.succeeded`.
- No frontend UI in this slice — the GraphQL CRUD surface (register/list/
  deactivate an endpoint, read its delivery log) is real and tested; an
  org-settings "Webhooks" admin tab is deliberately deferred, logged as open.

## GraphQL contract

`webhookEndpoints`, `webhookDeliveryLog(endpoint_id)` queries;
`createWebhookEndpoint` (returns `CreateWebhookEndpointResultType` — the
one place the plaintext secret is ever returned, at creation only, the
same "shown once" convention as an API key or TOTP backup code),
`deactivateWebhookEndpoint` mutations.

## A real finding, not scoped to this domain specifically

Writing this domain's own unit tests surfaced that `admin`/`super_admin`
are platform-wide **by design** in this codebase
(`common/scoping/tenant-scope.ts`'s `isPlatformOperator()`), regardless of
their own `client_org_id`. Gating this domain's mutations to `admin`-only
roles would have made its own `isSameOrg()` cross-tenant rejection checks
unreachable dead code — the only callers who could ever call them would
always be treated as allowed to see every org. Fixed by widening
`@Auth()` to include `manager` (this schema's real org-scoped top role).
See `TR095` for the full account.

## Test plan

See `TP096`.

## Test results

See `TR095`.
