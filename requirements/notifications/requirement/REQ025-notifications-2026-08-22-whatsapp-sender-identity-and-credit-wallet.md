---
id: REQ025
type: requirement
feature: notifications
created: 2026-08-22
updated: 2026-08-22
status: draft
parent: REQ008
related: [REQ008, REQ024]
---

# WhatsApp as a first-class channel, sender identity, and message credit wallet

## Source

`PRD-Healthcare-Booking-SaaS-India.md` §9 **M11 — Messaging & Notifications**, transactional-notification half (`FR-MSG-01`–`05`, `10`–`11`) and §2.3.4 ("WhatsApp is the patient channel... WhatsApp Business API is not optional"). Cross-referenced against `backend/src/notifications` and `project-plans/05-competitive-analysis.md` Tier 1 recommendation #1.

## Current state vs. PRD ambition

`REQ008` already built the right architecture for this: a real `NotificationTriggerService` reading per-user preferences with a defaults fallback, and a genuinely pluggable provider registry (`notifications/providers/registry.ts`) with per-org AES-256-GCM-encrypted credentials, currently implementing MSG91, Gupshup, Twilio, and AWS SNS. `project-plans/05-competitive-analysis.md` independently identified adding WhatsApp to this exact registry as *"the highest-ROI item in this document"* — the infrastructure is real and this requirement is additive to it, not a rebuild.

Gaps against the PRD:

1. **No WhatsApp provider in the registry.** This is the single highest-leverage gap in the entire PRD-vs-codebase comparison — every other piece of plumbing (encrypted credentials, per-event dispatch, preference-driven channel selection) already exists.
2. **No per-org sender identity** (`FR-MSG-03`) — WhatsApp display name, SMS sender ID, and email from-domain (DKIM/SPF) aren't configurable per tenant; today notifications don't carry the clinic's own branding, which undercuts the white-label positioning `project-plans/05` calls out as a real differentiator.
3. **No message credit wallet** (`FR-MSG-04`) — no balance tracking, auto-recharge, low-balance alerts, or per-message cost visibility to the tenant. This is also a monetisation gap: the PRD's plan matrix (§10.2) prices WhatsApp at ₹0.90/conversation as a metered add-on, which has no billing mechanism to attach to without this.
4. **No quiet hours or frequency caps** (`FR-MSG-05`) — notifications can be sent at any hour today with no cap on volume to one recipient.
5. **No delivery analytics** (`FR-MSG-11`) — sent/delivered/read/failed breakdown per template doesn't exist; failures are logged but not aggregated for review.
6. **No broadcast/campaign tool** (`FR-MSG-10`) — P2, no existing scaffolding, not urgent.
7. **Email is still a stub.** `NotificationTriggerService.dispatch()`'s email branch logs a line rather than sending via AWS SES — this predates the PRD and is a known, already-documented gap (`context/open-questions.md` #5), inherited here rather than re-discovered.

## Gap classification

- **Extend existing:** add a `WhatsAppProvider` to the existing registry (same shape as MSG91/Gupshup); wire real AWS SES sending to replace the email stub.
- **Net-new:** per-org sender identity configuration; message credit wallet with billing integration; quiet hours/frequency caps; delivery analytics; broadcast/campaign tool.
- **Already satisfied:** the trigger pipeline, preference-driven channel selection, encrypted per-org credential storage, the four existing SMS/voice providers.

## Phase assignment

PRD Phase: `FR-MSG-01`, `02`, `05` are **MVP (P0)**; `03`, `04`, `11` are **V1 GA (P1)**; `10` (broadcast) is **V2 (P2)**. Recommended internal sequencing: WhatsApp provider addition should be scheduled immediately — `project-plans/06-execution-plan.md` P5 Wave A already names it first, and this requirement should not wait for the full M11 scope to land before shipping it.

## Dependencies

- **Requires:** the existing `notifications/providers/registry.ts` architecture — no new transport pattern needed.
- **Blocks:** `REQ017`'s delay-broadcast and `REQ019`'s "your turn is near" notifications are materially more effective once WhatsApp is live, since SMS is deliverability-hostile per the PRD's own §2.3.4.

## User stories

### Epic: WhatsApp provider

**US-NOT-01** — As an Org Admin, I want to configure a WhatsApp Business API provider for my organization, so that patients receive booking confirmations and reminders on the channel they actually check.
- PRD refs: FR-MSG-02
- Priority: P0
- Acceptance criteria:
  - Given a WhatsApp provider is added to the registry (same interface as `msg91.provider.ts`/`gupshup.provider.ts`), when an org configures their WhatsApp Business Solution Provider credentials, then they are encrypted at rest using the existing `secrets.ts` AES-256-GCM mechanism, never re-exposed to the client.
  - Given WhatsApp is configured and set as an event's top channel priority, when a notification-triggering event occurs, then WhatsApp is attempted first, falling back to SMS only on failure — matching the PRD's stated channel priority (`Appendix C`: WhatsApp → SMS → push → email).

### Epic: Sender identity

**US-NOT-02** — As a patient receiving a WhatsApp message, I want to see the clinic's own name as the sender, not a generic platform name, so that the message feels like it's from my doctor's office.
- PRD refs: FR-MSG-03
- Priority: P1
- Acceptance criteria: given an org has configured a WhatsApp display name and SMS sender ID, outgoing messages use those identities; email uses the org's own verified from-domain with DKIM/SPF, not a shared platform domain.

### Epic: Credit wallet

**US-NOT-03** — As an Org Admin, I want to see my message credit balance, get alerted before it runs out, and optionally auto-recharge, so that reminders don't silently stop sending because the wallet is empty.
- PRD refs: FR-MSG-04
- Priority: P1
- Acceptance criteria: given a wallet balance below a configured threshold, an alert is sent to the Org Admin; given auto-recharge is enabled, the wallet tops up automatically when it would otherwise hit zero, using the tenant's existing subscription payment method (see `REQ033`).

### Epic: Guardrails and analytics

**US-NOT-04** — As a patient, I want notifications to respect quiet hours and not arrive more than a reasonable number of times per day, so that the clinic doesn't spam me.
- PRD refs: FR-MSG-05
- Priority: P0
- Acceptance criteria: given quiet hours are configured (e.g., 9 PM–8 AM), no non-urgent notification is sent in that window; a frequency cap prevents more than N messages to one recipient per day except for genuinely time-critical events (e.g., an imminent appointment).
  - Given a patient opts out of a channel, that opt-out is honoured irreversibly for that channel until the patient explicitly opts back in.

**US-NOT-05** — As an Org Admin, I want to see delivery analytics per template (sent/delivered/read/failed) with failure-reason drill-down, so that I can tell if reminders are actually reaching patients.
- PRD refs: FR-MSG-11
- Priority: P1
- Acceptance criteria: given a template has been sent 100 times, the analytics view breaks down outcomes and, for failures, shows the provider's reported reason, not just a generic "failed" count.

## Data model impact

- New `WhatsAppProvider` class implementing the existing `provider.interface.ts`, registered alongside the existing four.
- New `SenderIdentity` table per org: `whatsapp_display_name`, `sms_sender_id`, `email_from_domain`, `dkim_verified`, `spf_verified`.
- New `MessageCreditWallet` table: `client_org_id`, `balance`, `auto_recharge_enabled`, `auto_recharge_threshold`, `auto_recharge_amount`.
- `NotificationLog` (already conceptually present as delivery tracking) gains `cost` and a `delivery_status` enum (`sent|delivered|read|failed`) with a `failure_reason`.
- New `QuietHoursConfig`/frequency-cap fields on the existing `NotificationPreferences` or org settings.

## Non-functional notes

None beyond what `REQ008`'s existing pipeline already establishes (per-org encrypted credentials, preference-driven dispatch).

## Open questions

- Carried from `context/open-questions.md` #5 (partially resolved by `REQ008`, still open for real email sending): AWS SES credentials do not exist in this environment; email remains a stub until they do. This requirement's `FR-MSG` scope does not depend on email being real, since WhatsApp/SMS are the priority channels, but should not claim email delivery analytics are meaningful until the stub is replaced.
