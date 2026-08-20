---
id: PLAN011
type: requirement
feature: communications-policies
created: 2026-08-20
updated: 2026-08-20
status: done
parent: REQ006
related: [PLAN009]
---

# Implementation plan — Booking Policies + Communication (Email) Settings (REQ006 remainder)

Continues REQ006 after cancellation-rules (PLAN009) shipped. Scopes the two tabs that turned out to be partially unblocked once inspected closely: `admin/Policies.jsx`'s "Booking Policies" tab and `admin/Communications.jsx`'s "Global Settings" tab.

## Two new contract findings, logged rather than guessed at

1. **`admin/Communications.jsx`'s SMS Settings card contradicts the fixed-vendor rule.** It offers a Twilio/Vonage provider `<Select>` and a raw API-key text field — CLAUDE.md's vendor list is MSG91/Gupshup, fixed, not org-configurable. Not built (`context/open-questions.md` #6); the card is now visibly disabled with an explanatory `Alert` rather than silently non-functional. The Email half (From Name/Address/Reply-To/branding toggle) has no such conflict — it configures sender identity within the fixed AWS SES pipeline — and is built.
2. **`admin/Policies.jsx`'s "Cancellation Policy" + "Late Cancellation Fee" sliders conceptually overlap with the just-shipped Cancellation Rules feature** (same shape: hours + fee). Not built (`context/open-questions.md` #7); those two fields are now visibly disabled in the UI with a note pointing to the Cancellation Rules tab. No-Show Fee, Slot Buffer, Max Reschedules, and Retention Period are genuinely distinct and are built.

## A real, must-fix routing bug found during this pass

`/admin/policies` and `/admin/communications` were gated `RoleGuard roles={['admin', 'super_admin']}` — but `admin`/`super_admin` are deliberately platform-wide (`client_org_id: null`, per `seed.ts`). Both new resolvers (and, it turns out, cancellation-rules' global-rule path too) are scoped off the caller's own `client_org_id`, which only a `manager` has. The only roles that could reach these two pages could therefore never successfully save anything — every mutation would hit the "not linked to an organization" rejection. Fixed by splitting these two routes into their own `RoleGuard roles={['admin','super_admin','manager']}` block in `App.jsx` (same `AdminLayout` shell), matching the precedent already used for other manager-reachable routes elsewhere in the file. This also fixes reachability for the earlier cancellation-rules work, which had the same latent gap.

## Backend (`backend/src/org-settings/`)

New direct columns on `ClientOrganizations` (1:1, no new table needed — matches how `Clinics.timezone` etc. are modeled directly rather than via a satellite settings table): `email_from_name`/`email_from_address`/`email_reply_to`/`email_include_branding`, `no_show_fee_paise`/`slot_buffer_minutes`/`max_reschedules_per_month`/`data_retention_years`. Defaults match the mock UI's current hardcoded values, so no backfill needed.

`myOrgCommunicationSettings`/`updateMyOrgCommunicationSettings` and `myOrgBookingPolicies`/`updateMyOrgBookingPolicies` — self-scoped off `user.client_org_id`, returning `null` (query) / a clear `userErrors` message (mutation) for a platform-wide caller rather than crashing or silently no-op'ing. `no_show_fee` converts paise↔rupees at the resolver boundary, reusing the exact `PAISE_TO_RUPEES`/`RUPEES_TO_PAISE` pattern already established in `products.service.ts`.

## Frontend

`admin/Communications.jsx`'s Email Settings card and `admin/Policies.jsx`'s Booking Policies tab (4 of 6 fields) wired to the above. `App.jsx` routing fix described above.

## Verification

See [TP041](../../../test-plans/communications-policies/requirement/TP041-communications-policies-2026-08-20-booking-policies-and-email-settings.md) and [TR040](../../../test-results/communications-policies/requirement/TR040-communications-policies-2026-08-20-booking-policies-and-email-settings.md).
