---
id: REQ109
type: improvement
feature: prescriptions
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ021
related: [PLAN149, TP173, TR173]
---

# REQ109 — OTP-gated WhatsApp sharing of a prescription PDF

## Why this slice

`REQ021`'s own P1 scope (CLAUDE.md) explicitly deferred "WhatsApp/OTP-gated
sharing" of a prescription. `REQ057` already built real server-side PDF
generation (`backend/src/documents/`, REST, `pdfkit`) reusing
`PrescriptionsService#printPrescription()`'s already-org/patient-scoped
assembly — this slice adds one new distribution channel on top of that
existing, already-tested PDF, not a new document type.

Two real constraints found while scoping, both load-bearing for the
design below:

1. **The existing login-OTP path (`auth.service.ts#requestOtp`) is a
   stub** — it `console.log`s the code instead of sending it, and is
   keyed to a `UserProfiles.phone`, not a `Patients.phone`. It must NOT
   be reused here: a patient receiving a shared prescription frequently
   has no `Users` account at all (unlinked patient, or a dependant per
   `REQ018`'s family-profile model), and reusing a stub would silently
   never deliver the code. This is a real, separate, already-existing
   gap — not something this slice fixes.
2. **The real, already-working per-org channel dispatch is
   `NotificationProviderConfigService#getActiveConfigForOrg(orgId,
   channel)`** (used today by `NotificationTriggerService#sendWhatsapp`/
   `#sendSms` for REQ025's own event notifications) — it resolves the
   org's actually-configured MSG91/Gupshup/Twilio credentials and calls
   `provider.send(credentials, to, message)` directly against any phone
   number, no `Users` row required. This slice reuses that call path
   directly, not `auth.service.ts`'s stub.

## Design: two-channel delivery, not one

A single WhatsApp message containing both the PDF link and its own OTP
would defeat the point of a second factor (whoever has the phone that
received the WhatsApp message also has the code). This slice sends:

- **WhatsApp**: a short-lived signed link to a new public
  OTP-challenge page.
- **SMS, to the same registered `Patients.phone`**: the 6-digit OTP
  required to actually retrieve the PDF from that link.

If the org has no WhatsApp provider configured, the link is not sent at
all (matching `sendWhatsapp`'s own existing "skip, don't fail the
caller" convention) and the triggering mutation reports that plainly —
never a silent full failure, and never a fallback to sending the raw
PDF over an unverified channel.

## Acceptance criteria

- **Given** a clinician (or the patient themselves, via the patient
  portal) viewing a prescription they're authorized to see, **when**
  they choose "Share via WhatsApp", **then** a signed link (JWT, short
  TTL) is sent via the org's configured WhatsApp provider to the
  patient's own registered phone, and a 6-digit OTP is sent via the
  org's configured SMS provider to the same number.
- **Given** the recipient opens the link and enters the correct OTP
  within its TTL, **when** they submit, **then** the PDF is streamed
  back — the exact same bytes `printPrescription()` already produces.
- **Given** the link has expired, or the OTP is wrong 3 times, **when**
  the recipient attempts to retrieve the PDF, **then** the request is
  rejected with a clear, non-leaking error (no clue whether the
  prescription id or phone number itself is valid).
- **Given** a prescription that does not belong to the requesting
  clinician's org/patient, **when** a share is attempted, **then** it
  is rejected exactly as `printPrescription()` already rejects an
  unauthorized read (no new access-control logic invented — reused).
- **Given** the org has no WhatsApp provider configured, **when** a
  share is attempted, **then** the mutation returns
  `{success: false, userErrors: [...]}` rather than throwing or
  silently no-oping.

## Deliberately out of scope

- Telemedicine Practice Guidelines drug-list enforcement, regional-
  language rendering, digital signatures, and the pharmacy
  dispense-queue handoff — the other four items in `REQ021`'s own P1
  list, each its own future slice.
- Fixing `auth.service.ts#requestOtp`'s stub — flagged as a real,
  pre-existing, separate gap, not fixed here (out of scope; would need
  its own reviewed slice per this repo's own working-loop discipline).
- A "resend" cooldown/rate-limit UI beyond the OTP's own existing
  3-attempt lockout convention (`OTP_MAX_ATTEMPTS`) — reused as-is, not
  extended.

## Related gap found, not fixed here

`auth.service.ts#requestOtp`'s OTP-SMS send is a hardcoded `console.log`
stub, never wired to the real `NotificationProviderConfigService`
registry `REQ008` built — a real, separate, pre-existing gap unrelated
to this slice. Flagged for a future slice, not addressed here.
