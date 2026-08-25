---
id: CTX-platform-integrations-2026-08-25-req063
type: improvement
feature: platform-integrations
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ063
related: [PLAN090, TP117, TR116]
---

# platform-integrations — Webhook delivery log UI (2026-08-25)

Closes `project-plans/08-integration-gap-analysis.md` finding A-8 — the
last of the A-4–A-8 gap-fix batch found by a fresh backend-vs-frontend
integration sweep. `REQ030`'s own real, tested `webhookDeliveryLog` query
had no frontend UI — an org integrator had no way to see why their
webhook wasn't receiving events without direct DB access.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ063 | [Webhook delivery log UI](../../requirements/platform-integrations/improvement/REQ063-platform-integrations-2026-08-25-webhook-delivery-log-ui.md) |
| implementation-plans | PLAN090 | [implementation plan](../../implementation-plans/platform-integrations/improvement/PLAN090-platform-integrations-2026-08-25-webhook-delivery-log-ui.md) |
| test-plans | TP117 | [test plan](../../test-plans/platform-integrations/improvement/TP117-platform-integrations-2026-08-25-webhook-delivery-log-ui.md) |
| test-results | TR116 | [results — pass, 3/3](../../test-results/platform-integrations/improvement/TR116-platform-integrations-2026-08-25-webhook-delivery-log-ui.md) |

## What shipped

A "Delivery Log" button per webhook endpoint row and a dialog driven by
the real `webhookDeliveryLog` query, on `pages/settings/index.jsx`'s
Integrations tab. New `settings/index.test.jsx` (2 cases). e2e coverage
added to the shared `frontend/e2e/gap-analysis-a4-a8.spec.js` (1 of its 4
scenarios) — a real webhook endpoint against a deliberately unreachable
URL, a real `appointment.created` event, and a confirmed real `failed`
delivery entry.

## This is the last finding in the A-4–A-8 batch

`project-plans/08-integration-gap-analysis.md`'s own "Fix sequencing"
list marks A-4 through A-8 as one batch (S3, additive UI slices, batched
the way Phase G+1/G+2/G+3 batched similarly-scoped work); this closes
it. `A-9`/`A-10` remain S4/opportunistic, not part of this batch.
