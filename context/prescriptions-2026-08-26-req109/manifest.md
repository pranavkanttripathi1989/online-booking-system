---
id: CTX-prescriptions-2026-08-26-req109
type: improvement
feature: prescriptions
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ109
related: [PLAN149, TP173, TR173]
---

# prescriptions — REQ109: OTP-gated WhatsApp sharing of a prescription PDF (2026-08-26)

Final slice of the reconciled 14-slice batch
(`project-plans/10-next-14-slice-batch-reconciled.md`). `REQ021`'s own
P1 scope residue.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ109 | [OTP-gated WhatsApp sharing](../../requirements/prescriptions/improvement/REQ109-prescriptions-2026-08-26-otp-gated-whatsapp-sharing.md) |
| implementation-plans | PLAN149 | [implementation plan](../../implementation-plans/prescriptions/improvement/PLAN149-prescriptions-2026-08-26-otp-gated-whatsapp-sharing.md) |
| test-plans | TP173 | [verification plan](../../test-plans/prescriptions/improvement/TP173-prescriptions-2026-08-26-otp-gated-whatsapp-sharing.md) |
| test-results | TR173 | [verification results — pass, with 2 honest test-coverage gaps](../../test-results/prescriptions/improvement/TR173-prescriptions-2026-08-26-otp-gated-whatsapp-sharing.md) |

## What shipped

New `PrescriptionShareOtps` table (durable, not Redis — doubles as an
audit trail). `sharePrescriptionViaWhatsapp(id)` mutation: two-channel
delivery (WhatsApp carries a signed 15-minute link, SMS carries a
separate 6-digit OTP to the same phone — a single channel carrying
both would defeat the second factor). New public
`POST /documents/prescriptions/share-verify` REST endpoint (no `:id`
param — the prescription id is derived server-side from the signed
token's own claims, never client-supplied). New public
`/share/rx/:token` frontend page (OTP entry, no login). New "Share via
WhatsApp" button on `PrescriptionPrint.jsx`.

## Real design corrections found before writing code

1. **`printPrescription()` was not reused for access control** — it
   bumps `reprint_count` as a side effect, which would have mismarked
   the clinic's own original print as a "reprint" purely because a
   share happened. Used the already-private `loadPrescriptionForUser()`
   instead, with a new shared `assemblePrintPayload()` helper so the
   PDF content stays byte-identical between the two paths.
2. **Response shape is `{success, userErrors}`**, correcting the plan's
   own mis-cited "Staff/Notifications `{success}`-only precedent" —
   checked `05-cross-cutting-conventions.md`'s actual table, which says
   `{success}`-only is `Notifications` alone and explicitly recommends
   `{success, userErrors}` for a new domain.
3. **No `:id` in the share-verify URL** — derived from the signed
   token's own claims instead, so the id never needs to be
   client-supplied or appear in a probeable URL/path.
4. **`NotificationProviderConfigService` added to `NotificationsModule`'s
   exports** — needed direct WhatsApp+SMS provider-config access, not
   `NotificationTriggerService#dispatch()`'s single-recipient,
   `UserProfiles`-assuming shape.
5. **No new `documents.controller.spec.ts`** — no controller anywhere
   in this codebase has its own spec file; the substantive OTP logic
   is already covered one layer down.

## Honest test-coverage gaps

The share-verify controller's own thin logic (missing body fields,
invalid/expired token, wrong `purpose` claim) and the new public
`/share/rx/:token` page are built but not automated-test-covered — see
`TR173`'s own "Honest gaps" section. No e2e spec and no live
verification against a real WhatsApp/SMS provider account (none exists
in this dev environment) — both logged, not silently skipped.

## Verification

Backend: 90/90 unit suites, 1437/1437 tests (13 new); `tsc --noEmit`
and `eslint` clean. Integration: 4/4 suites, 387/387 tests (unchanged —
`documents/` has no resolver, structurally outside the matrix).
Frontend: `npm run lint` exits 0, `npm run build` succeeds, unit suite
144/145 (1 confirmed pre-existing full-parallel flake, 7/7 in
isolation).
