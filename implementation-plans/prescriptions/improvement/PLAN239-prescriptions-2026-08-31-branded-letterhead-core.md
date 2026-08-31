---
id: PLAN239
type: improvement
feature: prescriptions
created: 2026-08-31
updated: 2026-08-31
status: done
parent: REQ170
related: [TP259, TR259]
---

# PLAN239 — Implementation plan: branded clinic letterhead core

## Schema (`20260831010000_prescription_letterhead`)

Additive, nullable: `ClientOrganizations.tagline`, `Clinics.website`
(`@IsUrl`)/`alternate_phone`/`appointment_note`,
`Clinics.letterhead_clinician_ids Json` (ordered clinician-id array),
`Clinicians.specialty_highlights` (newline-separated bullets).

## Backend

1. `prescriptions.service.ts#assemblePrintPayload()` rewritten to fetch via
   `appointments.findUnique({ include: { clinic: { include: {
   client_organization: true } } } })` instead of an org-only lookup — the
   same join path `documents.service.ts#visitSummaryPdf` already uses.
2. New `resolveLetterheadDoctors(clinic)`: reads
   `letterhead_clinician_ids` in stored order via
   `ids.map(id => byId.get(id))`; falls back to `[issuing clinician]` when
   unset/empty.
3. `clinics.service.ts#update()`: validates any submitted
   `letterhead_clinician_ids` via `prisma.clinicians.count({ where: { id:
   { in: ids }, clinic: { client_org_id: existing.client_org_id } } })`,
   throwing `BadRequestException` on any id not belonging to the caller's
   own org (Hard Rule 6).
4. `render-pdf.ts#drawLetterhead()` gains an optional 5th `extra` param
   (tagline, doctors, language); new `drawDoctorBlock()`; new exported
   `drawLetterheadFooter()` (shaded rect, `accentColor` default
   `#006D77`), called once at the end of `drawPrescriptionPdf`.
5. New entity types: `PrescriptionLetterheadDoctorType`; extended
   `PrescriptionPrintClinicType` with
   `email/website/alternate_phone/appointment_note/tagline/primary_color/secondary_color`.
6. Fixed 3 pre-existing bugs found while wiring `specialty_highlights`
   through the same input path as `qualifications`/`registration_number`
   (DTO never declared them; the real mutation call never sent them;
   `CLINICIAN_FIELDS` fragment never selected `qualifications`) — see
   `REQ170` for the full account.

## Frontend

1. `PrescriptionPrint.jsx`: `PRINT_QUERY` exported and extended
   (`doctors`, clinic footer/tagline/colour fields); header renders
   `doctors.map(...)` (qualifications + `specialty_highlights.split('\n')`
   bullets + registration number); new footer `<Box>` styled with
   `clinic.primary_color || '#006D77'`.
2. `settings/index.jsx`: Website/Alternate Phone/Appointment Note fields;
   Tagline on Branding; a "Letterhead Doctors" multi-select
   (`GET_CLINICIANS_FOR_LETTERHEAD`), all writing through the existing
   `UPDATE_CLINIC_FOR_SETTINGS`/`updateMyOrgBranding` mutations (additive
   fields only).
3. `EditClinicianPage.jsx`/`CreateClinicianPage.jsx`: Specialty Highlights
   field added to the form schema, defaults, and the real mutation's
   `input` object (alongside the pre-existing-bug fix above).

## Docker/Prisma note (new, worth keeping)

`docker-compose.yml`'s `medibook_backend` service mounts an **anonymous
volume over `/app/node_modules`**, isolating the container's
`node_modules` — including the generated Prisma Client — from the host's.
A host-side `npx prisma generate` + `docker restart` does **not** pick up
schema changes inside the container; `docker exec medibook_backend npx
prisma generate` must run *inside* the container first. Confirmed live
this session: the container compiled with 10-12 stale-type tsc errors
across repeated restarts until the in-container regenerate was run.
