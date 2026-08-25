---
id: PLAN141
type: improvement
feature: patient-payments
created: 2026-08-26
updated: 2026-08-26
status: in-progress
parent: REQ101
related: []
---

# PLAN141 — Populate GST rate/GSTIN/place-of-supply on real appointment payments

## Schema (`backend/prisma/schema.prisma`)

**`Products`** (near the existing `hsn`/`is_tax_exempt` fields):
```prisma
  hsn               String?
  is_tax_exempt     Boolean  @default(false)
  gst_rate          Float?   // e.g. 18.0 for 18% — mirrors Drugs.gst_rate's own convention
```

**`Clinics`** (near the existing `city`/`postcode` fields):
```prisma
  city         String?
  postcode     String?
  // REQ101 — supplier-side GST fields. Both null until an admin
  // configures them; AppointmentPayments' own GST split stays null
  // (not guessed) until both this clinic's gstin AND the paid
  // product's gst_rate are set. `state` is also place_of_supply's
  // only source — Clinics has never had one (see clinic.input.ts's
  // own pre-existing comment flagging this).
  state        String?
  gstin        String?
```

No new indexes needed — neither column is filtered/sorted on.

## Migration

Hand-written SQL (this repo cannot run `prisma migrate dev`
non-interactively) at
`backend/prisma/migrations/20260826150000_gst_rate_clinic_state_gstin/migration.sql`:

```sql
ALTER TABLE "Products" ADD COLUMN "gst_rate" DOUBLE PRECISION;
ALTER TABLE "Clinics" ADD COLUMN "state" TEXT;
ALTER TABLE "Clinics" ADD COLUMN "gstin" TEXT;
```

Apply via `npx prisma migrate deploy`, then `npx prisma generate` on
BOTH host and inside `medibook_backend` (separate `node_modules` volume
— see `CLAUDE.md`'s own documented gotcha), then `docker restart
medibook_backend`.

## Backend

**`backend/src/products/dto/product.input.ts`** (or wherever `hsn`/
`is_tax_exempt` live — confirm exact filename): add
```ts
@Field({ nullable: true }) @IsOptional() @IsNumber() @Min(0) @Max(100) gst_rate?: number;
```
mirroring the existing `hsn`/`is_tax_exempt` optional-field style exactly.

**`backend/src/clinics/dto/clinic.input.ts`**: add, after `postcode`:
```ts
@Field({ nullable: true })
@IsOptional()
state?: string;

@Field({ nullable: true })
@IsOptional()
@Matches(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/, { message: 'GSTIN must be a valid 15-character format' })
gstin?: string;
```
(Standard 15-character Indian GSTIN regex — matches the existing
`@Matches` pattern style already used for `postcode`.)

**`backend/src/clinics/entities/clinic.entity.ts`**: add `state`/`gstin`
to the `@ObjectType()` so the new fields round-trip on read.

**`backend/src/appointment-payments/appointment-payments.service.ts`**,
`invoiceDetailsForSuccess()`: change to also fetch `appointment.clinic`
(already available via `include`, or add it) and:
```ts
const clinic = appointment?.clinic; // needs { include: { product: true, clinic: true } }
if (product?.hsn) gst.hsn_sac_code = product.hsn;
if (product?.is_tax_exempt) {
  gst.gst_rate = 0; gst.cgst_amount = 0; gst.sgst_amount = 0; gst.igst_amount = 0;
} else if (product?.gst_rate != null && clinic?.gstin) {
  gst.gst_rate = product.gst_rate;
  gst.gstin = clinic.gstin;
  gst.place_of_supply = clinic.state ?? undefined;
  const half = Math.round((amount * product.gst_rate) / 2 / 100); // amount already in paise
  gst.cgst_amount = half;
  gst.sgst_amount = half;
  gst.igst_amount = 0;
}
```
Update the comment above the method to record this slice's own
intrastate-only scoping decision (replacing the "logged as an open gap"
comment, not deleting the history — note it was closed by REQ101, with
the interstate case still explicitly out of scope).

## Frontend

- Wherever the service/product admin form edits `hsn`/`is_tax_exempt`
  (likely `manager/services/index.jsx` or `manager/products/` — confirm
  exact file before implementing), add a "GST Rate (%)" numeric
  `TextField` next to them.
- `frontend/src/pages/manager/clinics/create.jsx` and its edit
  counterpart: add "State" and "GSTIN" `TextField`s next to the existing
  City/Postcode fields, in the same `Grid` row style.
- No change needed to any payment-receipt display component unless it
  currently omits `place_of_supply`/`gstin` from an already-existing GST
  breakdown section — check `finances/index.jsx`'s receipt view before
  assuming.

## Testing

- `products.service.spec.ts`: `updateService`/`createService` accepts
  and persists `gst_rate`; rejects an out-of-range value (validation
  pipe, e.g. `150`).
- `clinics.service.spec.ts`: `create`/`update` accepts and persists
  `state`/`gstin`; rejects a malformed GSTIN.
- `appointment-payments.service.spec.ts`, `invoiceDetailsForSuccess`
  (or its caller) — new cases:
  1. Non-exempt product, `gst_rate` set, clinic `gstin` set → correct
     `cgst_amount`/`sgst_amount` split, `igst_amount: 0`,
     `place_of_supply` = clinic's state.
  2. Non-exempt product, `gst_rate` set, clinic `gstin` NOT set → all
     GST fields stay `null` (no guessing).
  3. Non-exempt product, `gst_rate` NOT set, clinic `gstin` set → all
     GST fields stay `null`.
  4. Exempt product → unchanged existing zero-fill behavior, regardless
     of `gst_rate`/`gstin`.
  5. Rounding case — an odd paise amount (e.g. 100001 paise at 18%)
     splits without losing/gaining a paise across `cgst_amount +
     sgst_amount` vs. the naive full tax amount (document the rounding
     rule chosen).
- Live verification: set a real clinic's `gstin`/`state` and a real
  product's `gst_rate` via the admin UI against the dev stack, run one
  real counter payment (`recordCounterPayment`), confirm the resulting
  row's GST split via direct SQL, then revert the test clinic/product
  fields.

## Documentation

`REQ101` (this), `PLAN141` (this), plus `TP###`/`TR###` test plan/
results, a context bundle, and index updates to
`requirements/patient-payments/README.md`,
`implementation-plans/patient-payments/README.md`,
`test-plans/patient-payments/README.md`,
`test-results/patient-payments/README.md`, and the five root indexes —
same convention as `REQ079`.
