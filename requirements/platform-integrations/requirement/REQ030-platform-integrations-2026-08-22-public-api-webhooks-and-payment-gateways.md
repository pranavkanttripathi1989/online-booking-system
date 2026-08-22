---
id: REQ030
type: requirement
feature: platform-integrations
created: 2026-08-22
updated: 2026-08-22
status: draft
parent: REQ015
related: [REQ015, REQ023]
---

# Public REST API, webhooks, second payment gateway, and third-party connectors

## Source

`PRD-Healthcare-Booking-SaaS-India.md` §9 **M16 — Integrations & Extensibility** (`FR-INT-01`–`07`). Cross-referenced against `backend/src/app.module.ts` (existing GraphQL-only surface) and `project-plans/02-findings-register.md` F-07.

## Current state vs. PRD ambition

The current API surface is GraphQL-only, code-first, and internal — there is no versioned public REST API, no OpenAPI spec, no webhook delivery mechanism for external consumers, and only one payment gateway (Razorpay) with no stated failover. Real-time internal subscriptions exist (`appointmentUpdated`, `messageReceived` over `graphql-ws`) but these are not the same thing as `FR-INT-02`'s externally-facing, signed, retry-with-backoff webhooks for third-party integrators.

## Gap classification

- **Net-new, entirely:** public REST API v1 with OpenAPI spec and sandbox keys; externally-facing webhooks with signed payloads and retry; second payment gateway as failover; LIS/HL7 v2 interface; accounting integrations; Zapier/Make connector.
- **Reusable groundwork:** `REQ015`'s API-key infrastructure is the authentication layer this module's public API sits behind — build once, use for both.

## Phase assignment

PRD Phase: `FR-INT-01`–`04` are **V1 GA (P1)**; `FR-INT-05`–`07` are **V2 (P2)**.

## Dependencies

- **Requires:** `REQ015`'s API keys/OAuth2 client credentials.
- **Blocks:** none — this is a platform capability other integrations attach to, not a blocker for other requirements' core functionality.

## User stories

### Epic: Public API

**US-INT-01** — As a partner integrator, I want a versioned, documented REST API with sandbox keys and rate limits, so that I can build against a stable contract without reverse-engineering the internal GraphQL schema.
- PRD refs: FR-INT-01
- Priority: P1
- Acceptance criteria: given a published OpenAPI spec, a sandbox key can call every documented endpoint with realistic rate limits, and write operations accept idempotency keys so a retried request never double-creates a resource.

### Epic: Webhooks

**US-INT-02** — As a partner integrator, I want signed webhook payloads for appointment, payment, prescription, and inventory events with automatic retry on failure, so that I don't have to poll for changes.
- PRD refs: FR-INT-02
- Priority: P1
- Acceptance criteria: given a webhook endpoint fails to acknowledge delivery, retries follow an exponential backoff schedule up to a defined limit; every payload is signed so the receiver can verify authenticity.

### Epic: Payment resilience

**US-INT-03** — As the system, I want a second payment gateway configured as failover to Razorpay, so that a single gateway outage doesn't stop patients from paying at all.
- PRD refs: FR-INT-03
- Priority: P0
- Acceptance criteria: given Razorpay is unreachable, payment routes to the failover gateway automatically, and the choice is logged for reconciliation; this extends rather than replaces the existing `REQ004`/`REQ023` Razorpay integration.

### Epic: Third-party connectors

**US-INT-04** — As a Branch Manager, I want to export financial data to Tally or Zoho Books, so that our accountant doesn't re-key everything manually.
- PRD refs: FR-INT-06
- Priority: P2
- Acceptance criteria: a Tally-XML and Zoho-Books-compatible export exists for the standard billing/GST data already produced by `REQ023`.

## Data model impact

- New `ApiKeys` (shared with `REQ015`), `WebhookSubscriptions`, and `WebhookDeliveryLog` tables.
- Payment gateway abstraction layer generalising the current Razorpay-specific `appointment-payments.service.ts` to support a second provider behind the same interface.

## Non-functional notes

External-facing API surfaces are a new attack surface — every endpoint must go through the same fail-closed guard chain and tenant-scoping discipline `project-plans` already audited for the internal GraphQL API, not a separately-implemented, potentially weaker auth path.

## Open questions

None raised in PRD §19 specific to this module.
