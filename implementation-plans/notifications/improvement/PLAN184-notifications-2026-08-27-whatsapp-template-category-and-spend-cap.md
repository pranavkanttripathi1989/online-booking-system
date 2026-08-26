---
id: PLAN184
type: improvement
feature: notifications
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ144
related: []
---

# PLAN184 — Implementation plan for WhatsApp template-category routing + conversation metering

## Schema

`NotificationSendLog` extended: `template_category String?`, `billable
Boolean @default(false)`, `cost_micro_rupees Int?`, plus a composite
index `(client_org_id, channel, template_category, sent_at)` supporting
the spend `groupBy` (migration `20260827010000_whatsapp_template_category`).

`ClientOrganizations` extended: `whatsapp_monthly_cap_paise Int?`
(migration `20260827020000_whatsapp_monthly_cap`).

Both applied via `npx prisma migrate deploy` + `npx prisma generate`
(this environment cannot run `prisma migrate dev` non-interactively —
hand-written SQL per `CLAUDE.md`'s standing convention).

## Backend changes

**`notification-trigger.service.ts`** — new `TemplateCategory` type,
`TEMPLATE_CATEGORY` map (event type → category), `TRANSACTIONAL_EVENTS`
list, `CATEGORY_RATE_MICRO_RUPEES` map, and exported pure function
`resolveTemplateCategory(eventType)`. `logSendAttempt()` now computes
`billable = channel === 'whatsapp' && status === 'sent'` and
`templateCategory = channel === 'whatsapp' ? resolveTemplateCategory(eventType) : null`
and writes all three new columns on every insert.

**`notification-billing.service.ts`** (new) —
`NotificationBillingService.getConversationSpend(user, orgId?)`:
computes the current IST calendar month's UTC bounds
(`currentIstMonthBoundsUtc`, shift-to-IST → zero to the 1st → shift back,
so the boundary is correct regardless of the caller's own UTC offset),
scopes via `isPlatformOperator(user) ? (orgId ? {client_org_id: orgId} : {}) : orgScope(user)`
(Hard Rule 6 — never trust a client-supplied org id for a non-platform
caller), and groups `NotificationSendLog` by `template_category` where
`channel: 'whatsapp', billable: true, sent_at` inside the period.

**`notifications.entity.ts`** — `WhatsappCategorySpendType`,
`WhatsappConversationSpendType`.

**`notifications.resolver.ts`** — `whatsappConversationSpend` (manager+,
same gate as the existing `notificationDeliveryAnalytics`), converting
the service's internal micro-rupee figures to rupees only at this
resolver boundary (Hard Rule 9).

**`notifications.module.ts`** — registers `NotificationBillingService`.

**`org-settings.input.ts`** / **`org-settings.entity.ts`** /
**`org-settings.service.ts`** — `UpdateOrgCommunicationSettingsInput`
gained `whatsapp_monthly_cap_rupees` (optional `Float`, `@Min(0)`);
`OrgCommunicationSettingsType` gained the same field;
`toCommunicationSettings()`/`updateMyCommunicationSettings()` convert to/
from paise, following the exact undefined-leaves-alone /
null-clears / number-sets convention `session_timeout_minutes` and
`logo_url` already use on the same row.

## Frontend changes

**`admin/Communications.jsx`** (Global Settings tab) — new
`GET_WHATSAPP_SPEND` query (network-only, loaded on mount alongside the
page's existing three parallel loads); `GET_COMMUNICATION_SETTINGS` /
`UPDATE_COMMUNICATION_SETTINGS` extended with
`whatsapp_monthly_cap_rupees`. New full-width card: billing-period dates,
a `<TableContainer><Table>` category breakdown (Rule 5 — every table
needs one), a cap `TextField` (`aria-label` since it has no visible
`InputLabel`, per `A11Y-12`), a `LinearProgress` spend-vs-cap bar
(primary → warning at 80% → error at/over 100%), and "remaining" vs.
"over cap" text switching on sign. `handleSaveCap()` sends only
`{whatsapp_monthly_cap_rupees}` — never re-sends the email fields, so a
stale local email draft can't clobber a saved value on a cap-only save.
Client-side rejects a negative cap before ever calling the mutation.
Uses `theme.palette.primary.main` (via `useTheme()`), not a hex literal,
for new code — `UI-2`.

## Testing (see `TP204`)

**Backend** — `notification-trigger.service.spec.ts` (pre-existing from
this same slice's earlier work in-session): `resolveTemplateCategory`
classification for every transactional event, the marketing exception,
the unmapped-event-fails-expensive case, and dispatch-level assertions
that a sent/failed WhatsApp row carries the right
category/billable/cost, with the pre-existing SMS success-log assertion
extended to include the new (always-null-for-SMS) columns.
`notification-billing.service.spec.ts` (new) — tenant scoping (org-bound
ignores `orgId`, platform operator honours it, platform operator with no
`orgId` sees every org), the IST month-boundary computation (a UTC-day
case that straddles the IST month rollover), and aggregation shape
(mapping, null-category exclusion, zeroed empty case).
`notifications.resolver.spec.ts` (extended) — role gate for
`whatsappConversationSpend`, argument passthrough, and the
micro-rupee → rupee conversion at the resolver boundary.
`org-settings.service.spec.ts` (extended) — rupee↔paise conversion,
omitted-leaves-untouched, explicit-null-clears, and the read-back
undefined-not-zero case.

**Frontend** — new `admin/Communications.test.jsx`: empty state, a real
category breakdown + total render, cap pre-fill + remaining-budget
display, the over-cap error-color path, a successful cap save (asserting
the mutation variables are cap-only), and the negative-cap client-side
rejection.

## Verification

Backend: `npx jest --maxWorkers=2` — 94 suites / 1586 tests green.
`npx tsc --noEmit` clean. `npx eslint "{src,apps,libs,test}/**/*.ts"`
clean. Frontend: `npm run lint` — 1,906 warnings, unchanged from the
documented baseline (zero new warnings introduced). `npm run build`
succeeds. `node scripts/check-page-data-wiring.mjs` — no new findings.

Not done this slice: a live pass against the real dev stack (no
WhatsApp provider is configured in this dev environment per REQ144's own
"deliberately not built" section — there is no frontend UI to configure
one yet), so `whatsappConversationSpend` has not been exercised against
a real Meta send. The unit and integration-shaped mocked-Prisma coverage
above is what stands behind this slice; flagged honestly rather than
claimed as live-verified, matching this codebase's own established
convention for a slice with no reachable live credential path.
