---
id: PLAN149
type: improvement
feature: prescriptions
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ109
related: [TP173, TR173]
---

# PLAN149 — OTP-gated WhatsApp sharing of a prescription PDF

## Backend

**New table** (`backend/prisma/schema.prisma` + a hand-written migration
under `backend/prisma/migrations/` — this repo cannot run `prisma
migrate dev` non-interactively):

```prisma
model PrescriptionShareOtps {
  id             String   @id @default(uuid())
  prescription_id String
  phone          String
  otp_code       String
  attempts       Int      @default(0)
  expires_at     DateTime
  consumed_at    DateTime?
  created_at     DateTime @default(now())

  prescription   Prescriptions @relation(fields: [prescription_id], references: [id])

  @@index([prescription_id])
}
```

A dedicated table rather than Redis (unlike the login-OTP stub) because
this OTP gates a REST download that must survive a Redis restart within
its TTL window, and because a durable row lets `attempts`/`consumed_at`
double as the audit trail for "was this prescription ever shared, and
did the recipient ever actually retrieve it" — a real clinical-safety
question this repo's own conventions (audit logging, F-10) already
treat as worth persisting.

**`backend/src/prescriptions/prescriptions.service.ts`** — new
`sharePrescriptionViaWhatsapp(id: string, user: JwtPayload)`:
1. Calls the *existing* `printPrescription(id, user)` first — this is
   the only access-control check; if it throws, this method throws
   identically, no new logic.
2. Loads the patient's `phone` (already fetched inside
   `printPrescription`'s own patient lookup — thread it through rather
   than re-querying).
3. Generates a 6-digit OTP (`crypto.randomInt`, matching
   `auth.service.ts`'s own existing pattern) and a signed link token
   (`jwtService.sign({purpose: 'rx_share', prescriptionId: id},
   {expiresIn: '15m'})` — mirrors `auth.service.ts`'s own
   `TOTP_CHALLENGE_PURPOSE` JWT-as-short-lived-token pattern).
4. Writes a `PrescriptionShareOtps` row (`otp_code`, `expires_at: now +
   15m`).
5. Resolves the caller's org (`user.client_org_id`, or the
   prescription's own org for a platform operator — reuse whatever
   `printPrescription` already resolved).
6. `providerConfigService.getActiveConfigForOrg(orgId, 'whatsapp')` —
   if null, return `{success: false, userErrors: [{message: 'No
   WhatsApp provider configured for this organization'}]}` immediately,
   matching `sendWhatsapp`'s own skip-don't-fail convention.
7. Send the link via the WhatsApp provider's `.send()`; send the OTP via
   `getActiveConfigForOrg(orgId, 'sms')`'s provider `.send()` — two
   separate provider calls, two separate channels, matching REQ109's
   own two-factor design.
8. Return `{success: true, userErrors: []}` (the entity-direct
   convention doesn't apply here — this mutation has no entity to
   return, matching `Staff`/`Notifications`' own `{success}`-only
   precedent per `05-cross-cutting-conventions.md`'s response-shape
   table).

**`backend/src/prescriptions/prescriptions.resolver.ts`** — new
mutation `sharePrescriptionViaWhatsapp(id: ID!)`, same `@Auth(...)` gate
already on `printPrescription`'s own resolver method (clinician +
patient-self, per `REQ021`'s existing gate — check the real decorator
before copying verbatim).

**New public REST endpoints** (`backend/src/documents/` — extends the
existing REST controller, not a new module, since it's the same
PDF-serving concern):
- `POST /documents/prescriptions/:id/share-verify` — body `{otp}`,
  looks up the matching non-consumed, non-expired
  `PrescriptionShareOtps` row for that `prescription_id`; wrong code
  increments `attempts` (lock out at 3, matching `OTP_MAX_ATTEMPTS`);
  correct code sets `consumed_at`, verifies the signed link token from
  the `Authorization` or a query param, and streams the PDF via the
  *existing* `documentsService.prescriptionPdf`-equivalent rendering
  (refactor the render call so it doesn't require a `JwtPayload` — it
  currently calls `printPrescription(id, user)` for access control,
  which this path deliberately bypasses since the OTP itself IS the
  access control for this one-time link).

**No new tenancy-matrix domain** — this endpoint's only access control
is OTP possession, not org/role, matching `documents`' own existing
"no tenancy-matrix coverage, REST-only, access control delegated"
precedent (see `documents.controller.ts`'s own header comment).

## Frontend

**`frontend/src/pages/prescriptions/PrescriptionPrint.jsx`** — new
"Share via WhatsApp" button next to the existing "Download PDF" button
(same `startIcon`/loading-state pattern as `handleDownload`), calling
the new `sharePrescriptionViaWhatsapp` mutation; on success, a toast
confirming a link was sent to the patient's registered number (last 2
digits only, e.g. "…89", never the full number — avoid an unnecessary
PHI echo in the UI).

**New public page** `frontend/src/pages/share/prescription-otp.jsx`
(route `/share/rx/:token`, `OptionalAuthShell`-style — no login
required, matching the public booking-widget pattern): reads the
`token` from the URL, shows an OTP entry form, `POST`s to
`/documents/prescriptions/:id/share-verify`, and on success triggers
the same authenticated-PDF-download helper pattern
(`utils/documents.js`, already built for `REQ057`) against the returned
PDF bytes.

## Testing

- `prescriptions.service.spec.ts`: `sharePrescriptionViaWhatsapp` —
  happy path (both sends called with correct args); rejects for an
  unauthorized caller (delegates to `printPrescription`'s own
  rejection, asserted via a mock throwing); returns `{success:false}`
  when no WhatsApp provider is configured; returns `{success:false}`
  when no SMS provider is configured (WhatsApp sent but OTP undeliverable
  — must not report success in that case).
- New `documents.controller.spec.ts` (or extend the existing one):
  `share-verify` — correct OTP within TTL streams the PDF; wrong OTP
  increments attempts and eventually locks out; expired `expires_at`
  rejected; expired/invalid signed link token rejected; a second
  verify attempt against an already-`consumed_at` row rejected (one-time
  use).
- Frontend: a new `PrescriptionPrint.test.jsx` case for the new button
  (loading state, success toast, error toast when the mutation reports
  `success:false`); no e2e spec for the public OTP page in this slice
  (would require driving a real WhatsApp/SMS provider or mocking two
  providers end-to-end — flag as a live-verification gap to close
  manually against the real dev stack, matching this session's own
  established pattern of verifying REST/OTP flows via direct
  curl+DB rather than Playwright when no real provider account exists).

## Outcome (2026-08-26)

Implemented largely as planned, with several real corrections found
while reading the actual code before writing any of it:

1. **`printPrescription()` was NOT reused for access control, contrary
   to this plan's own step 1.** It increments `Prescriptions.reprint_count`
   as a side effect on every call — reusing it inside
   `sharePrescriptionViaWhatsapp()` would have silently marked the
   clinic's own original print as a "reprint"/"DUPLICATE" the next time
   anyone viewed it, purely because a share happened. Used the
   already-private `loadPrescriptionForUser()` instead (the actual
   access-control-only half of `printPrescription`) — identical
   rejection behaviour, zero side effect on the counter. Refactored
   `printPrescription`'s own assembly logic into a shared
   `assemblePrintPayload()` private helper so `printPrescription` (bumps
   the counter) and the new `assembleForShare()` (does not) share
   everything except that one line, rather than duplicating the
   clinic/clinician/patient lookups twice.
2. **Response shape is `{success, userErrors}`, not the `{success}`-only
   shape this plan's own step 8 called "Staff/Notifications'
   precedent."** Checked `05-cross-cutting-conventions.md`'s actual
   response-shape table first: `{success}`-only is `Notifications`
   alone; `Staff` returns its entity directly; and the table's own
   explicit rule for a brand-new domain is "use `{success, userErrors}`
   for anything." Also matches `REQ109`'s own acceptance criteria,
   which requires a real error message on failure (a bare boolean
   couldn't say "no WhatsApp provider configured").
3. **The share-verify REST endpoint takes no `:id` URL parameter**,
   unlike this plan's own `POST /documents/prescriptions/:id/share-verify`
   suggestion. The frontend OTP page only ever has the signed link
   token (from the URL) — deriving `prescriptionId` from that token
   server-side (`POST /documents/prescriptions/share-verify`, body
   `{token, otp}`) avoids ever needing the id client-side at all, and
   keeps it out of any URL or request path where it could be probed.
4. **`NotificationProviderConfigService` had to be added to
   `NotificationsModule`'s own `exports` array** — it's `@Global()` but
   only exported `NotificationsService`/`NotificationTriggerService`
   before this slice. `PrescriptionsService` needs direct provider-config
   access (WhatsApp and SMS as two independent lookups) rather than
   `NotificationTriggerService#dispatch()`'s own single-recipient shape,
   which assumes a `UserProfiles` row a shared prescription's recipient
   frequently doesn't have.
5. **No new `documents.controller.spec.ts`.** No controller in this
   entire codebase has ever had its own spec file — every REST
   controller here is deliberately thin, with its real logic tested at
   the service layer. The share-verify endpoint's only controller-specific
   logic (parsing the body, verifying the JWT, checking `purpose`) is a
   few lines; the substantive OTP lockout/expiry/consumption logic is
   already covered by `prescriptions.service.spec.ts`'s own
   `verifyShareOtp` tests, and the render path by
   `documents.service.spec.ts`'s own `prescriptionPdfForShare` tests.
   Matched the established convention rather than introducing a new
   testing shape for one file.
6. **No new tenancy-matrix entry** — `documents/` has no `.resolver.ts`
   file at all (REST-only), so `matrix-coverage.int-spec.ts`'s own
   `resolverDomains()` never discovers it as a domain to police in the
   first place, the exact same structural reason `AttachmentsController`/
   `OrgBrandingController` are already uncovered. Confirmed via an
   unchanged 387/387 integration-suite run.
7. **No new e2e Playwright spec**, and no live verification against a
   real WhatsApp/SMS provider account (none exists in this dev
   environment) — both honestly logged gaps, matching this plan's own
   testing section and this batch's own established pattern
   (`REQ072`/`REQ106`/`REQ107`/`REQ108`).
