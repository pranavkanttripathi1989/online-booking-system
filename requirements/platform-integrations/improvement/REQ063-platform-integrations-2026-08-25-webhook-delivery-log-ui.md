---
id: REQ063
type: improvement
feature: platform-integrations
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ030
related: []
---

# REQ063 — Webhook delivery log UI

## Source

`project-plans/analysis/08-integration-gap-analysis.md` finding A-8 — a fresh
sweep cross-checking every backend GraphQL operation against real
frontend usage. Closes real, already-shipped backend capability from
`REQ030`'s own scope that never got frontend UI.

## Current-state gap

`backend/src/webhooks/webhooks.resolver.ts` — `webhookDeliveryLog
(endpoint_id)` (returns `id`/`event_type`/`status`/`http_status`/
`attempted_at`/`response_snippet` per delivery attempt), gated
`manager`/`admin`/`super_admin`, real and tested.
`settings/index.jsx`'s Integrations tab managed webhook endpoints
(create/deactivate, reveals the signing secret once) but never queried
`webhookDeliveryLog` — confirmed zero matches. Lower severity than the
other findings in this batch (an operator-debugging view, not a blocking
workflow), but a real org integrator had no way to see *why* their
integration wasn't receiving events, short of direct DB access.

## What shipped

A "Delivery Log" button on each webhook endpoint row in
`settings/index.jsx`'s Integrations tab, opening a dialog driven by the
real `webhookDeliveryLog(endpoint_id)` query: event type, status
(success/failed, color-coded), HTTP status code, and timestamp per
attempt, or a real empty state when nothing has fired yet.

## User stories

- As a manager or admin, I can see whether a webhook endpoint's recent
  deliveries succeeded or failed, and their HTTP status, without needing
  direct database access.

## Acceptance criteria (Given/When/Then)

- **Given** a webhook endpoint with no deliveries yet, **when** its
  Delivery Log is opened, **then** a real empty state is shown.
- **Given** a real event fires against an endpoint (e.g. a booking
  triggers `appointment.created`), **when** the Delivery Log is
  reopened, **then** the real attempt appears with its actual status
  (including a genuine `failed` status against an unreachable
  endpoint — not swallowed).

## Traceability

`REQ030` (US-INT-02, signed outbound webhook delivery) — this closes the
frontend half of the delivery-log read side; the backend query already
shipped. No new `FR-*` scope — UI completion for already-specified
backend capability.
