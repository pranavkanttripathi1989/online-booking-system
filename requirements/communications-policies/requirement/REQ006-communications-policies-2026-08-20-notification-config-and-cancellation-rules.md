---
id: REQ006
type: requirement
feature: communications-policies
created: 2026-08-20
updated: 2026-08-21
status: in-progress
parent: null
related: [PLAN009, PLAN011]
---

# Communications & Policies — Backend Requirements

**Progress (2026-08-21):** Cancellation Rules (`PLAN009`) and Booking Policies + Email settings (`PLAN011`) are done and tested. Still open: `admin/Communications.jsx`'s SMS Settings card (blocked on `context/open-questions.md` #6 — its Twilio/Vonage picker contradicts the fixed MSG91/Gupshup vendor rule; now visibly disabled rather than silently non-functional) and Policies' Cancellation Policy/Late-Fee sliders (blocked on `context/open-questions.md` #7 — likely duplicate of Cancellation Rules; also visibly disabled). Not yet started at all, not even blocked: the "Notification Templates" tab (this doc's own Open Question 1 — possible duplicate of the already-real `admin/EmailTemplates.jsx`, unresolved) and Policies' "Security settings" tab (this doc's Open Question 2 — possible overlap with `REQ005`'s Account & Security tab, unresolved).

**Why this exists (original, 2026-08-20):** two admin pages, three tabs each, all currently mock or partially-mock: `admin/Communications.jsx` (route `/admin/communications`) and `admin/Policies.jsx` (route `/admin/policies`).

## Scope

### `admin/Communications.jsx` — 3 tabs

1. **"Notification Templates" tab** — a hardcoded `EMAIL_TEMPLATES` array (`{id, name, trigger, channel: email|sms|email+sms, active}`). **This likely overlaps with the already-real `email-templates` backend domain** (`backend/src/email-templates`, consumed by the separately-real `admin/EmailTemplates.jsx`) — but the shapes don't match: this page's mock has `trigger`/`channel`/`active`, the real `EmailTemplates` model has `name`/`subject`/`body`/`type`/`variables`. **Open question, not resolved here**: is this page meant to be the same feature as `admin/EmailTemplates.jsx` (in which case it should be redirected/merged, not separately built), or a genuinely distinct "which trigger fires which template on which channel" configuration layer sitting on top of the existing templates? Don't build a second, parallel templates system without resolving this.
2. **"Global Settings" tab** — needs inspection during the implementation-plan pass (not read in detail for this requirement) to determine real scope.
3. **"Send Test Message" tab** — SMS sending depends on the MSG91/Gupshup integration, which is currently a stub (`auth.service.ts`: `console.log('[OTP STUB] Would send...')`) — **this requirement cannot deliver real SMS test-sends until that vendor integration is live**, same blocker class as Razorpay for patient payments. Email test-sends are more tractable but depend on AWS SES actually being wired (currently: templates are CRUD-only, nothing sends — see the last status audit).

### `admin/Policies.jsx` — 3 tabs

1. **Cancellation rules** — the page already has real-looking inline `gql` (`GET_CANCELLATION_RULES`, `CREATE_RULE`, `UPDATE_RULE`, `DELETE_RULE`) calling `cancellationRules`/`createCancellationRule`/etc. **Confirmed by direct check of `backend/src/schema.gql`: none of these resolvers exist.** Only a **read-only, public-dialect** `PublicCancellationRule` type exists (`cancellation_rules: [PublicCancellationRule!]!`, used by the patient-facing booking flow to *display* a clinic's policy) — there is no admin CRUD resolver at all, despite `ProductCancellationRules` already existing as a real Prisma model (`schema.prisma:548`). This is a genuine "frontend written ahead of backend" gap, not a wiring-only fix — the admin CRUD resolvers need to be built against the already-modeled table.
2. **General policies tab** — hardcoded `POLICIES` array, needs inspection for real scope during the implementation-plan pass.
3. **Security settings tab** — hardcoded `SECURITY` array; check for overlap with `requirements/settings` `REQ005`'s Account & Security tab before building a second, possibly-redundant security-settings surface.

## Constraints (from CLAUDE.md, restated for this domain)

- Cancellation rules are tenant-scoped data (tied to a clinic/org via `ProductCancellationRules`'s relation) — the admin CRUD resolvers need the same create-path org-validation CLAUDE.md hard rule 6 calls out by name as a repeated bug class (`createAvailability`/`createSpacerBlock`/`createClinician`/`createAppointment` all needed this fix after initially missing it) — don't repeat it on `createCancellationRule`.
- Don't invent a second SMS/email-sending pathway — reuse whatever the real MSG91/SES integration ends up being once built (tracked separately, not by this requirement).

## Open questions (not resolved here)

1. Is `admin/Communications.jsx`'s "Notification Templates" tab the same feature as `admin/EmailTemplates.jsx`, or genuinely distinct? Resolve before scoping backend work — building a second templates system would be a real, avoidable duplication.
2. Does `admin/Policies.jsx`'s "Security settings" tab overlap with `REQ005`'s Account & Security tab? If so, which page is canonical?
3. "Global Settings" and general "Policies" tabs need a closer read (not done for this requirement) before their real scope is known.

## Acceptance criteria (high-level)

- Cancellation rules: real CRUD against `ProductCancellationRules`, tenant-isolated, matching the page's own already-written GraphQL contract (field names, `{success, userErrors}` convention — this domain already committed to that mutation-response shape in its own inline `gql`, so the resolvers must match it, not invent a different convention).
- Notification-template configuration (once the overlap-with-EmailTemplates question is resolved) has a single source of truth, not two competing pages.
- SMS/email test-send tabs are explicitly gated behind the real vendor integrations landing — not stubbed to look functional.
