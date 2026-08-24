---
id: CTX-platform-integrations-2026-08-24-req030
type: requirement
feature: platform-integrations
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ030
related: [PLAN069, TP096, TR095]
---

# platform-integrations — REQ030 slice: signed outbound webhook delivery (2026-08-24)

Fifth of eight requirement slices in this pass (REQ018 → REQ032 → REQ034
→ REQ022 → **REQ030** → REQ031 → REQ015 → REQ029).

## Documents

| Root | ID | Doc |
|---|---|---|
| implementation-plans | PLAN069 | [signed outbound webhook delivery](../../implementation-plans/platform-integrations/requirement/PLAN069-platform-integrations-2026-08-24-signed-webhook-delivery.md) |
| test-plans | TP096 | [verification plan](../../test-plans/platform-integrations/requirement/TP096-platform-integrations-2026-08-24-signed-webhook-delivery.md) |
| test-results | TR095 | [verification results — pass](../../test-results/platform-integrations/requirement/TR095-platform-integrations-2026-08-24-signed-webhook-delivery.md) |

## What shipped

`WebhookEndpoints`/`WebhookDeliveryLog`, HMAC-SHA256-signed delivery
(`X-MediBook-Signature`), fired from real domain events — `appointment
.created`/`.confirmed`/`.cancelled` (reusing `REQ018`'s new
`awaiting_payment`→`confirmed` transition), `payment.succeeded`. Retry
with exponential backoff (this story's own P1 acceptance criterion) is
deliberately deferred — no new queue/worker infra this slice;
`WebhookDeliveryLog` records every attempt so a failed delivery is visible
and re-triggerable by hand.

## A real finding that also applied to REQ015's API keys

`common/scoping/tenant-scope.ts`'s `isPlatformOperator()` treats every
`admin`/`super_admin` caller as platform-wide unconditionally. Gating this
domain's mutations to admin-only roles made its own `isSameOrg()`
cross-tenant check unreachable dead code. Fixed by widening `@Auth()` to
include `manager` — caught by writing this domain's own unit tests, the
same review pass that caught the identical issue in `api-keys` (`REQ015`).

## Next in this pass

REQ031 (insurance payer master + empanelment).
