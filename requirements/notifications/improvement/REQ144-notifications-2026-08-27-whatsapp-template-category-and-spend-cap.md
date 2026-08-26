---
id: REQ144
type: improvement
feature: notifications
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ025
related: [REQ048, REQ069]
---

# REQ144 — WhatsApp template-category routing + conversation metering

## Source

`project-plans/phase-plans/01-phase1-close-the-gates.md` slice **P1-01**,
the first slice of Phase 1. Dated business deadline: from **1 October
2026** Meta stops treating a utility/service WhatsApp conversation inside
the 24-hour service window as free — it becomes chargeable at ₹0.1150.
Marketing is ₹0.8631, **7.5× utility**
(`PRD-v2-CareOS.md` §pricing, live-verified 2026-08-27 against Meta's own
published India rate card). A reminder or receipt mis-classified as
marketing costs 7.5× what it should, silently, at volume — a real margin
risk, not a cosmetic one.

## Current-state gap

`notification-trigger.service.ts`'s WhatsApp dispatch path (built by
`REQ025`) sent a plain-text message via whichever provider the org had
configured, with no concept of a Meta conversation category at all.
`NotificationSendLog` (extended by `REQ069` for delivery analytics) had
no columns to record one. There was no way to answer "what is this
org's WhatsApp spend this month" without pulling raw provider invoices.

## What shipped

**Category is resolved server-side, never caller-supplied.**
`resolveTemplateCategory(eventType)` (exported, pure) looks up a fixed
`TEMPLATE_CATEGORY` map from event type to `'utility' | 'marketing' |
'authentication'` — there is no parameter anywhere in the dispatch chain
through which a call site could override it, so a transactional event
cannot drift into the 7.5× tier even if a future call site tried to. As
a second, defensive layer, `resolveTemplateCategory` also asserts at
runtime that no event in a fixed `TRANSACTIONAL_EVENTS` list can ever
resolve to `'marketing'`, and throws if it would — protecting against a
future edit to the map itself, not just a future caller.

Every real transactional event type (`new_appointment`,
`appointment_reminder`, `appointment_cancelled`, `payment_received`,
`queue_delay`) is `'utility'`. `new_review` (a post-visit review nudge,
not a receipt) is the one deliberately `'marketing'`-classified event.
An unmapped/future event type fails toward the **expensive** category,
never toward free — the safe direction to be wrong in.

`NotificationSendLog` gained `template_category String?`, `billable
Boolean @default(false)`, `cost_micro_rupees Int?` (migration
`20260827010000_whatsapp_template_category`). Money is normally stored
as paise (Hard Rule 9), but Meta's real per-message rates are sub-paise
(₹0.1150 = 11.50 paise) — these three columns use **micro-rupees**
(1 rupee = 1,000,000) instead, the smallest scaled integer that makes
both ₹0.1150 and ₹0.8631 exact integers, converted to rupees only at the
resolver boundary like every other money field. Only a **successfully
sent** WhatsApp row is billable — a failed send never opened a
conversation with Meta, so it's logged with `billable: false,
cost_micro_rupees: null` even though its category is still recorded (for
delivery-analytics visibility, matching `REQ069`'s own convention of
logging every attempt).

New `NotificationBillingService.getConversationSpend(user, orgId?)`
aggregates the current **IST calendar month**'s billable WhatsApp rows
by category (`NotificationSendLog.groupBy`), org-scoped via the standard
`orgScope`/`isPlatformOperator` helpers (Hard Rule 6 — a client-supplied
`orgId` is honoured only for a platform operator inspecting a specific
tenant; an org-scoped caller is always scoped to their own org
regardless of it). Exposed as `whatsappConversationSpend` (manager+),
returning period bounds, a per-category breakdown, and a total.

**Cap and UI.** `ClientOrganizations.whatsapp_monthly_cap_paise` (nullable
— null means no cap configured, a visibility control today, not an
enforcement point; `REQ032`'s entitlement guard is the natural future
consumer) is settable via the existing `updateMyOrgCommunicationSettings`
partial-update mutation (`whatsapp_monthly_cap_rupees`, explicit `null`
clears it, omitted leaves it untouched — the same convention every other
nullable field on that org row already uses).
`admin/Communications.jsx`'s Global Settings tab gained a WhatsApp
Conversation Spend card: billing-period dates, a category breakdown
table (count + cost), total cost, a cap input, and a progress bar showing
spend-vs-cap with amount remaining (or "over cap" in the error color once
exceeded).

## Deliberately not built

- **Enforcement.** Nothing currently blocks a send once the cap is
  exceeded — this slice is metering and visibility, matching the phase
  plan's own scoping ("Exposed to the plan engine (P1-04 consumes this)").
  Building the block belongs with `REQ032`'s entitlement guard, per
  `CLAUDE.md`'s standing caution to scope that guard as its own reviewed
  step rather than a rider on an unrelated slice.
- **WhatsApp provider configuration UI.** Investigating this slice found
  that no frontend page configures the org's WhatsApp provider credentials
  at all — only SMS (`admin/Communications.jsx`'s existing "OTP / SMS
  Provider" card). `REQ048` registered the `gupshup_whatsapp` provider in
  the backend registry, but nothing lets an admin actually select it and
  enter credentials. This is a real, separate gap, logged here rather than
  silently expanded into — `context/open-questions.md` is the right place
  for it, not a rider on a metering slice.
- **`authentication` category in practice.** OTP/login is SMS-only in
  this codebase (`REQ008`) — no event currently resolves to
  `'authentication'`. The category and its (same-as-utility) rate are
  modeled for when that changes, not exercised by any real event today.

## User stories

- As an org admin, a transactional WhatsApp message (reminder,
  confirmation, receipt) can never be billed at the marketing rate, even
  by a future coding mistake.
- As an org admin, I can see this month's WhatsApp spend by category and
  in total, and set an optional monthly cap so I know before 1 Oct 2026
  whether my organization's usage is going to cost more than expected.

## Acceptance criteria (Given/When/Then)

- **Given** a successfully sent `appointment_reminder` WhatsApp message,
  **when** the send is logged, **then** `template_category: 'utility'`,
  `billable: true`, `cost_micro_rupees: 115000`.
- **Given** the one deliberately promotional event (`new_review`),
  **when** sent successfully via WhatsApp, **then** it is logged
  `template_category: 'marketing'`, `cost_micro_rupees: 863100`.
- **Given** a failed WhatsApp send, **when** logged, **then**
  `billable: false` and `cost_micro_rupees: null`, regardless of category.
- **Given** an org-scoped manager, **when** they query
  `whatsappConversationSpend` with a different org's id, **then** the
  `orgId` argument is ignored and their own org's data is returned.
- **Given** a platform operator with no org, **when** they query with an
  explicit `orgId`, **then** that specific org's spend is returned.
- **Given** a manager sets a ₹5,000 monthly cap, **when** ₹100 has been
  spent this period, **then** the Communications page shows ₹4,900
  remaining; **given** spend exceeds the cap, **then** it shows the
  excess in the error color instead of a negative number.

## Traceability

`REQ025` (`US-NOT-01`, `US-NOT-04`), `PRD-v2-CareOS.md` §pricing,
`FR-AGENT-08` (metering precedent). `project-plans/phase-plans/01-phase1-close-the-gates.md`
slice P1-01.
