---
id: CTX-patient-payments-2026-08-26-req101
type: improvement
feature: patient-payments
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ101
related: [PLAN141, TP165, TR165]
---

# patient-payments — REQ101: GST rate/GSTIN on real appointment payments (2026-08-26)

Slice of the reconciled 14-slice batch (`project-plans/analysis/10-next-14-slice-batch-reconciled.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ101 | [GST rate/GSTIN](../../requirements/patient-payments/improvement/REQ101-patient-payments-2026-08-26-gst-rate-and-clinic-gstin.md) |
| implementation-plans | PLAN141 | [implementation plan](../../implementation-plans/patient-payments/improvement/PLAN141-patient-payments-2026-08-26-gst-rate-and-clinic-gstin.md) |
| test-plans | TP165 | [verification plan](../../test-plans/patient-payments/improvement/TP165-patient-payments-2026-08-26-gst-rate-and-clinic-gstin.md) |
| test-results | TR165 | [verification results — pass](../../test-results/patient-payments/improvement/TR165-patient-payments-2026-08-26-gst-rate-and-clinic-gstin.md) |

## What shipped

New `Products.gst_rate` and `Clinics.state`/`Clinics.gstin` columns
(migration `20260826170000_gst_rate_clinic_state_gstin`). Original F-17
finding said `AppointmentPayments` had no GST fields at all — stale,
`REQ047` already added them. The real gap was one layer deeper: no
source for a real rate/GSTIN to populate them with. Closed by
`invoiceDetailsForSuccess()` now computing a real CGST+SGST split
(intrastate-only — no structured patient address to determine
interstate) once both the product's `gst_rate` and the clinic's `gstin`
are configured; either missing leaves every GST field `null`, never
guessed. New "GST Rate (%)" field on the services admin form, "State"/
"GSTIN" fields on the clinic create/edit forms.

## Verification

6/6 backend suites, 151/151 tests (4 new payment-split cases + 2
persistence cases), `tsc --noEmit` clean. Frontend: 0 lint errors,
services form's 4-test suite green (one fixture query-shape fix
needed). Full backend suite re-run clean end to end.
