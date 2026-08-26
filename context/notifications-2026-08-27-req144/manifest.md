---
id: CTX-notifications-2026-08-27-req144
type: improvement
feature: notifications
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ144
related: [PLAN184, TP204, TR204]
---

# notifications — WhatsApp template-category routing + conversation metering (2026-08-27)

Slice **P1-01**, the first slice of Phase 1
(`project-plans/phase-plans/01-phase1-close-the-gates.md`). Dated
business deadline: from 1 October 2026 a WhatsApp utility/service
conversation stops being free — mis-classifying a transactional message
as marketing costs 7.5× what it should. `resolveTemplateCategory()`
pins one Meta billing category per event type, server-side and never
caller-overridable; `NotificationSendLog` now carries
category/billable/cost on every WhatsApp row; a new
`whatsappConversationSpend` query and an `admin/Communications.jsx` card
surface live per-tenant spend and an optional monthly cap, both tracks
shipped together per the phase-plan's own parallel-track rule.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ144 | [WhatsApp template-category routing + conversation metering](../../requirements/notifications/improvement/REQ144-notifications-2026-08-27-whatsapp-template-category-and-spend-cap.md) |
| implementation-plans | PLAN184 | [implementation plan](../../implementation-plans/notifications/improvement/PLAN184-notifications-2026-08-27-whatsapp-template-category-and-spend-cap.md) |
| test-plans | TP204 | [test plan](../../test-plans/notifications/improvement/TP204-notifications-2026-08-27-whatsapp-template-category-and-spend-cap.md) |
| test-results | TR204 | [results](../../test-results/notifications/improvement/TR204-notifications-2026-08-27-whatsapp-template-category-and-spend-cap.md) |

## What shipped

- **Schema**: `NotificationSendLog.{template_category, billable,
  cost_micro_rupees}` + composite index; `ClientOrganizations.whatsapp_monthly_cap_paise`.
  Two migrations: `20260827010000_whatsapp_template_category`,
  `20260827020000_whatsapp_monthly_cap`.
- **Backend**: `resolveTemplateCategory()` (exported, pure, no
  caller-override path) in `notification-trigger.service.ts`; new
  `NotificationBillingService` (IST-month-scoped, tenant-scoped spend
  aggregation); `whatsappConversationSpend` query (manager+);
  `UpdateOrgCommunicationSettingsInput.whatsapp_monthly_cap_rupees`.
- **Frontend**: `admin/Communications.jsx` Global Settings tab gained a
  WhatsApp Conversation Spend card — category breakdown table, total,
  cap input, spend-vs-cap progress bar with remaining/over-cap text.

## Real gap found while scoping (not fixed here — logged)

No frontend UI configures the org's WhatsApp provider credentials at
all (`REQ048` registered `gupshup_whatsapp` in the backend registry, but
`admin/Communications.jsx` only has an "OTP / SMS Provider" card, never
a WhatsApp one). Logged in `REQ144`'s own "deliberately not built"
section rather than expanded into, since it's a separate, pre-existing
gap, not part of category routing or metering.

## Live verification

Not performed against a real WhatsApp send — no dev org has WhatsApp
provider credentials configured (see the gap above). The category/cost/
scoping/IST-boundary logic that carries this slice's actual risk is
covered directly by the mocked-Prisma unit suite (94 suites / 1586
tests green) and a real-DOM frontend test
(`admin/Communications.test.jsx`, 6/6). Flagged plainly per `TR204`.
