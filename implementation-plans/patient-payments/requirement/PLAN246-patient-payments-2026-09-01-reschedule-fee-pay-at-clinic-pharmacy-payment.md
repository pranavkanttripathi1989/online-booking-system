---
id: PLAN246
type: requirement
feature: patient-payments
created: 2026-09-01
updated: 2026-09-01
status: done
parent: REQ177
related: [TP266, TR266]
---

# PLAN246 — Implementation plan: reschedule fee, pay-at-clinic, pharmacy payment

## Schema (same migration as PLAN244/245)

```prisma
model PharmacyPayments {
  id                  String   @id @default(uuid())
  clinic_id           String
  client_org_id       String?
  patient_id          String
  prescription_id     String?
  amount              Int
  tenders_json        Json
  gstin               String?
  hsn_sac_code        String?
  gst_rate            Float?
  cgst_amount         Int?
  sgst_amount         Int?
  igst_amount         Int?
  recorded_by_user_id String
  created_at          DateTime @default(now())
  clinic       Clinics              @relation(fields: [clinic_id], references: [id])
  client_org   ClientOrganizations? @relation(fields: [client_org_id], references: [id])
  patient      Patients             @relation(fields: [patient_id], references: [id])
  prescription Prescriptions?       @relation(fields: [prescription_id], references: [id])
  recorded_by  Users                @relation(fields: [recorded_by_user_id], references: [id])
}
```

Separate table, not a widened `AppointmentPayments` (whose
`appointment_id` is `NOT NULL`, single-purpose by design).

## `appointments.service.ts#update()` — reschedule fee

After the existing update transaction: if `timeChanged && input.status !==
'cancelled'`, looks up the most recent `succeeded` `AppointmentPayments`
row for this appointment; if found, `hoursBefore = hoursBetween(new
Date(), existing.appointment_time)` (the **original**, pre-update time —
the actual risk a reschedule fee compensates for), fetches `rule_type:
'reschedule'` rules for the clinic's org, computes the fee via
`cancellation-fee.ts` (`PLAN245`). A non-zero fee creates a new `pending`
`AppointmentPayments` row (`metadata: {reason: 'reschedule_fee'}`) and the
result is threaded back through `toGraphQL()`'s new 5th param
(`{amount, paymentId}`), surfaced as `reschedule_fee_amount`/
`reschedule_fee_payment_id` on `AppointmentType` — response-only, not a
persisted appointment attribute (documented on the entity: "populated
ONLY by this specific call").

**Real bug fixed before shipping**: `reschedule_fee_amount` initially
returned raw paise (`Int` field) instead of converting via
`PAISE_TO_RUPEES` at the resolver boundary, unlike every other money
field on this entity (`AppointmentServiceType.price`, `Float`). Fixed the
conversion and widened the GraphQL type `Int → Float` — a
percentage-type fee's rupee value isn't always round.

## `public` module — pay-at-clinic

`PublicProductType`/`public.service.ts#getProducts()` gained
`prepayment_policy` (already existed on `Products`, never exposed on this
dialect). `BookPatientAppointmentInput` gained `paymentPreference:
'online'|'pay_at_clinic'` (`@IsIn`); `bookPatientAppointment()` rejects
`pay_at_clinic` outright when `product.prepayment_policy === 'required'`.

**Deliberately not fixed, flagged**: the online path itself never checks
`prepayment_policy` either (always `status: 'scheduled'` unconditionally)
— a distinct, pre-existing gap, out of this slice's scope.

## `booking/index.jsx`

`GET_CLINICIAN_AND_PRODUCTS` query gained `prepayment_policy`.
`PaymentForm` gained `paymentPreference` state (default `'online'`); when
`bookingData.product.prepayment_policy !== 'required'`, a real
`ToggleButtonGroup` ("Pay Online Now" / "Pay at Clinic") replaces the
previous unconditional Razorpay-only copy — `PAY-2`'s own explicit "equal
weight, not hidden" rule. Choosing pay-at-clinic skips
`createRazorpayOrder`/the Razorpay widget entirely; the booking
(`paymentPreference` passed straight through) comes back `confirmed`.

## `pharmacy` module — counter payment

`RecordPharmacyPaymentInput`/`PharmacyPaymentTenderInput` (same
`tender_type|amount|reference` shape as `RecordCounterPaymentInput`,
rupees at the boundary). `recordPharmacyPayment()` — `assertClinicInScope`,
validates the patient exists, sums tenders to paise, creates the
`PharmacyPayments` row. GST fields deliberately left null (no per-line
drug breakdown exists to correctly allocate different GST rates across a
mixed payment — matches `invoiceDetailsForSuccess()`'s "never guess GST"
convention). `@Auth('staff','manager','admin','super_admin')`, matching
`dispensePrescriptionItem`'s own gate.

`manager/pharmacy/index.jsx` — "Collect Payment" button next to "Change
patient" on the Dispense tab (disabled with an explanatory `Alert` when no
clinic is selected — `STATE-4`); a dialog with the same multi-tender
entry UI (`Tender`/`Amount`/`Reference` rows, add/remove) as
`appointments/detail.jsx`'s own Take Payment dialog.

## Testing

`appointments.service.spec.ts` gained a dedicated `update — reschedule
fee` describe block (5 tests: fee created on short notice, none on long
notice, none with no prior payment, none on a cancellation, none when
`start_datetime` is unchanged) plus constructor mocks for the two new
injected services (`PaymentGatewayConfigService`, `CancellationRulesService`)
and an `appointmentPayments` mock — 114/114 in that file.
`pharmacy.service.spec.ts` gained a `recordPharmacyPayment` describe
block (4 tests, including the exact paise-summing assertion) — 25/25 in
that file.

## Live verification

Full backend unit suite green (142 suites / 2260 tests), `tsc --noEmit`
and `eslint` clean, live GraphQL schema introspection confirmed
`recordPharmacyPayment` served. `booking/index.jsx`'s own test suite
(8/8) required updating its locally-duplicated `GET_CLINICIAN_AND_PRODUCTS`
query literal + mock data to add `prepayment_policy` — `MockedProvider`
matches on the exact query AST, and the real component query changed;
found via the suite's own `waitFor(() => getByText('Sarah Mitchell'))`
failing once run in isolation (a full 4-suite combined run had shown it
as a resource-contention flake at first, until an isolated re-run
revealed the real, consistent cause). A live pay-at-clinic booking
click-through and a live reschedule-fee trigger were not additionally
run this session — both paths are fully covered by their respective unit
suites, and the booking wizard's own real-backend e2e coverage
(`frontend/e2e/`) was not re-run for this specific new toggle.
