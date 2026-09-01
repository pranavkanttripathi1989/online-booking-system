---
id: REQ177
type: requirement
feature: patient-payments
created: 2026-09-01
updated: 2026-09-01
status: done
parent: REQ004
related: [REQ175, REQ176, REQ022]
---

# Reschedule fee, pay-at-clinic booking choice, and pharmacy counter payment

## Source

Direct user request (three related gaps closed together, per the approved
plan's own slice-3 grouping): reschedule fees ("same for rescheduling" as
cancellation fees), a real pay-at-clinic option at booking time (PAY-2's own
explicit hard rule — "'Pay at clinic' MUST be a visible, equal-weight
option"), and pharmacy purchases collecting real payment (per the approved
account-granularity answer, "pharmacy billing added this pass").

## Current state (before this requirement)

- No reschedule-fee concept existed anywhere.
- `booking/index.jsx` unconditionally forced Razorpay checkout for every
  booking; the only thing that varied booking behaviour was
  `Products.prepayment_policy` (`required|optional|none`), which delayed to
  `awaiting_payment` — never a patient-facing choice.
- Pharmacy dispensing (`REQ022`) collected zero payment — `mrp_paise` was a
  reference price only, never charged.

## What this ships

- **`appointments.service.ts#update()`** — when `start_datetime` changes on
  an appointment with a real prior succeeded payment (and the update isn't
  itself a cancellation), computes a reschedule fee via the same
  `cancellation-fee.ts` engine (`REQ176`) against `rule_type: 'reschedule'`
  rules, based on notice given before the **original** slot (the risk the
  fee compensates for), not the new one. A non-zero fee creates a new
  `pending` `AppointmentPayments` row and surfaces `reschedule_fee_amount`/
  `reschedule_fee_payment_id` directly in `updateAppointment`'s own
  response — a one-off "what just happened" signal, not a persisted
  appointment attribute — so the frontend can prompt immediately without a
  second round-trip.
- **`bookPatientAppointment`** gained `paymentPreference: 'online'|
  'pay_at_clinic'`, rejected outright when the service's
  `prepayment_policy === 'required'` (unchanged existing rule — a
  required-prepayment service was never eligible for pay-at-clinic).
  `booking/index.jsx`'s payment step now shows a real, equal-weight "Pay
  Online Now"/"Pay at Clinic" `ToggleButtonGroup` (hidden entirely when
  prepayment is required); choosing pay-at-clinic skips Razorpay entirely
  and the appointment comes back `confirmed`.
- **`recordPharmacyPayment`** (new mutation) — same `tenders:
  PaymentTenderInput[]` shape as `recordCounterPayment`, writes a new
  `PharmacyPayments` row (a separate, minimal table, not a widened
  `AppointmentPayments`, whose `appointment_id` is `NOT NULL` and whose
  single-purpose shape this schema deliberately avoids overloading). GST
  fields deliberately left null — no per-line-item drug breakdown exists in
  this schema to correctly allocate different drugs' different GST rates
  across one mixed payment; a guessed figure would be worse than none,
  matching `invoiceDetailsForSuccess()`'s own established "never guess GST"
  convention. `manager/pharmacy/index.jsx`'s Dispense tab gained a "Collect
  Payment" action against the page's own already-selected clinic, with the
  same multi-tender entry UI `appointments/detail.jsx`'s Take Payment
  dialog already uses.

## Deliberately NOT built (recorded, not silently dropped)

- An online-gateway checkout path for pharmacy purchases — counter payment
  only; pharmacy purchases are overwhelmingly in-person.
- A pre-existing, adjacent gap flagged but deliberately not fixed in this
  pass: `bookPatientAppointment` never checks `prepayment_policy` for the
  ONLINE path either (always sets `status: 'scheduled'` unconditionally,
  regardless of policy) — a distinct issue from what was asked, out of
  scope here.

## Acceptance criteria

**US-PAY-05**: As staff, rescheduling an appointment with a real prior
payment against a short-notice reschedule computes a fee, based on notice
before the original slot.
- Given a ₹1000 paid appointment and a reschedule rule requiring 48h notice
  with a fixed ₹200 fee, when it's rescheduled with only 2h notice before
  the *original* time, then a new pending ₹200 payment is created and
  `updateAppointment` reports it.
- Given 72h notice before the original slot, when rescheduled, then no fee
  payment is created.

**US-PAY-06**: As a patient, I can choose to pay at the clinic instead of
online, unless the service requires prepayment.
- Given a service with `prepayment_policy: 'none'`, when I reach the
  payment step, then "Pay Online Now" and "Pay at Clinic" are shown as
  equal-weight options.
- Given I choose "Pay at Clinic", when I confirm, then my appointment is
  booked `confirmed` with no Razorpay call made, and I'm told to pay at the
  clinic.
- Given a service with `prepayment_policy: 'required'`, when I reach the
  payment step, then only the online payment flow is shown — no
  pay-at-clinic choice.

**US-PAY-07**: As pharmacy staff, I can collect a real payment for a
patient's purchase.
- Given a selected clinic and patient, when I record a ₹200 cash tender,
  then a `PharmacyPayments` row is created for the correct clinic/patient
  with the tender amount in paise.

## Data model impact

`AppointmentType` gains `reschedule_fee_amount`/`reschedule_fee_payment_id`
(response-only, not persisted appointment attributes). `PharmacyPayments`
(new table).
