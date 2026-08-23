---
id: PLAN050
type: requirement
feature: patient-payments
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ047
related: [PLAN044]
---

# PLAN050 — Implementation plan: GST fields and invoice numbering

## Files touched

- `backend/prisma/schema.prisma` (`AppointmentPayments.place_of_supply`/
  `invoice_number`, new `InvoiceSequences` model, `Clinics.invoiceSequences`
  back-relation)
- `backend/prisma/migrations/20260823070000_appointment_payments_gst_and_invoice_numbering/migration.sql` (new)
- `backend/src/appointment-payments/appointment-payments.service.ts`
- `backend/src/appointment-payments/appointment-payments.service.spec.ts`
- `backend/src/appointment-payments/entities/appointment-payment.entity.ts`

## Design decisions

1. **`upsert`, not a manual find-then-create-or-update transaction, for the
   sequence.** Prisma's `upsert` on a table with a `@@unique` constraint
   compiles to a single atomic `INSERT ... ON CONFLICT DO UPDATE` at the
   Postgres level — genuinely race-free without needing an explicit
   `SELECT ... FOR UPDATE` or a wrapping `$transaction`. A manual
   find-then-branch approach has a real TOCTOU window: two concurrent
   payments for a clinic's first-ever invoice this financial year could
   both observe "no row exists" and both attempt `create`, with one
   throwing on the unique constraint instead of correctly becoming an
   increment.
2. **Invoice logic called from both `verifyRazorpayPayment` and the
   webhook's `payment.captured` branch, not factored into one shared
   "on success" hook.** These are two genuinely different code paths for
   the same event (client-side verification vs. server-to-server webhook,
   per `REQ040`'s own design) that can each be the one to observe success
   first — both need to run the same logic, and there's no existing shared
   status-transition function to hang it on without a larger refactor of
   working, already-tested code.
3. **GST amount fields only ever get real values, never a guessed
   default.** Checked whether `Products` had a `gst_rate` before assuming
   one — it doesn't (`REQ046`'s own scoped decision), and no org-level
   GSTIN/state config exists either. Rather than silently defaulting to a
   plausible-looking 18%, non-exempt items get `hsn_sac_code` (from the
   product, if set) and nothing else — `gstin`/`place_of_supply`/`gst_rate`/
   `cgst_amount`/`sgst_amount`/`igst_amount` stay `null`, documented as an
   explicit, tested gap in `REQ047` rather than an oversight.
4. **`invoice_number` added only to `FinanceTransactionType`, not to
   `TransactionType` (manager dashboard) or the two admin-analytics
   surfaces.** The AC's persona is "Accountant" reading `finances/
   index.jsx`'s Payment History — the one surface that already exists for
   this exact purpose. Widening every payment-adjacent GraphQL type was
   not asked for by this specific acceptance criterion.

## Verification

- `npx prisma migrate deploy` against `postgres_test` — applied cleanly.
- `npx prisma generate` — Prisma Client regenerated with `InvoiceSequences`
  and the two new `AppointmentPayments` columns.
- `npx jest appointment-payments.service --maxWorkers=2` — 35/35 pass (5
  new/changed: invoice-number format + gaplessness, exempt-item zeroing,
  deliberate non-exempt null-out, the two pre-existing exact-match
  assertions updated from a literal object to `objectContaining` now that
  the update payload carries more fields by design).
- `npx tsc --noEmit` — 0 new errors (same 2 pre-existing, unrelated errors
  as `PLAN048`/`PLAN049`).
- `npx eslint src/appointment-payments` — 0 errors, 0 warnings.
- `npx prisma validate` — schema valid.
