---
id: REQ170
type: improvement
feature: prescriptions
created: 2026-08-31
updated: 2026-08-31
status: done
parent: REQ021
related: [PLAN239, TP259, TR259, REQ171, REQ172]
---

# REQ170 — Branded clinic letterhead on the prescription print (competitor-driven)

## Why this slice

The user supplied 4 real photographs of a HealthPlix-EMR-generated
prescription for "Sunshine Hospital — Ortho & Gynae Care" (Pune) and asked
for "this kind of prescription on clinic letterhead" in Hindi and English.
`prescriptions.service.ts`'s own existing comment already named this as
deferred scope: *"no dedicated 'letterhead' concept exists, and building one
is out of this slice's scope (see PLAN057)."* This closes that deferral.

## Competitor analysis

The reference image's letterhead pattern (standard across HealthPlix,
Practo Ray, DocEngage): logo + clinic name + tagline, **two doctor blocks
side-by-side** (name, degree line, bulleted sub-specialty lines each), and a
coloured two-tone **footer band** with full address, email, website, two
phone numbers, and an appointment note ("open Sunday by appointment"). This
codebase's own prior output (`documents.service.ts#drawPrescriptionPdf`,
`PrescriptionPrint.jsx`) drew logo + clinic name + phone only, one doctor
(always the issuing clinician), and no footer at all —
`assemblePrintPayload` even hardcoded `address: undefined`.

## Scope shipped

- `ClientOrganizations.tagline`, `Clinics.website`/`alternate_phone`/
  `appointment_note`, `Clinicians.specialty_highlights`,
  `Clinics.letterhead_clinician_ids` (ordered `Json` array of clinician
  ids) — all additive, nullable columns
  (`20260831010000_prescription_letterhead`).
- `prescriptions.service.ts#assemblePrintPayload()` rewritten to resolve
  the real branch (`Appointments.clinic_id → Clinics`, the same join path
  `documents.service.ts#visitSummaryPdf` already uses) instead of an
  org-only lookup, so the footer reads the clinic that actually hosted the
  visit, not just the org.
- `resolveLetterheadDoctors()`: reads `letterhead_clinician_ids` in
  admin-configured order; falls back to `[issuing clinician]` when unset —
  zero regression for every org that never configures it.
- PDF (`render-pdf.ts#drawLetterhead`/new `drawLetterheadFooter`) and
  on-screen preview (`PrescriptionPrint.jsx`) both render the multi-doctor
  header and the footer band, styled with the org's own real
  `primary_color`/`secondary_color` — not the reference image's literal
  HealthPlix blue/red, which would be off-brand for every other tenant.
- Settings UI (manager/admin, `settings/index.jsx`): Website/Alternate
  Phone/Appointment Note fields on Clinic Information; Tagline on
  Branding; a "Letterhead Doctors" multi-select. `EditClinicianPage.jsx`/
  `CreateClinicianPage.jsx` gained a Specialty Highlights field.

## Real pre-existing bugs found and fixed (not originally scoped)

Found while wiring `specialty_highlights` through the same clinician-input
path as the already-existing `qualifications`/`registration_number`
fields, at three separate layers of the same defect:

1. `ClinicianInput` DTO never declared `qualifications`/
   `registration_number` at all, despite `EditClinicianPage.jsx` collecting
   both since `REQ021`.
2. The real `createClinician`/`updateClinician` mutation calls (both
   Create and Edit pages) never actually included these fields in their
   `input` object — only an unreachable `.catch()` mock fallback
   referenced them — meaning they were silently never sent, not rejected
   by validation.
3. `CLINICIAN_FIELDS` (`frontend/src/graphql/queries.js`) never selected
   `qualifications` at all, so even after the backend fix, the Edit page's
   pre-fill would always read `undefined`.

All three fixed as part of this slice, since `specialty_highlights` needed
the identical input path to work at all.

## Deliberately deferred

- A literal pixel-match to the reference image's specific colours/fonts —
  the correct generalisation is "this org's own real brand identity",
  not copying a competitor's palette.
- Print-preview vs. PDF pixel parity beyond both rendering the same
  content — they are two independent rendering engines (browser CSS vs.
  pdfkit) by long-standing design (`REQ021`).

## Acceptance criteria

- Given a clinic has `letterhead_clinician_ids` and footer fields
  configured, when a prescription from that clinic is previewed or
  downloaded, then both doctors render with their qualifications and
  bulleted specialty highlights, and the footer shows the clinic's real
  address/phones/email/website/appointment note in the org's own brand
  colour.
- Given a clinic never configures any of these fields, when a
  prescription is printed, then it renders exactly as before this slice
  (single issuing-clinician header, no footer) — a pure regression check.
- Given a `letterhead_clinician_ids` value is submitted on `updateClinic`,
  when any id does not belong to a clinician in the caller's own org, then
  the mutation is rejected (Hard Rule 6 cross-domain FK validation).
