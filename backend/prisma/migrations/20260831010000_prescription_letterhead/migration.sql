-- REQ170/REQ171/REQ172 -- branded clinic letterhead + bilingual
-- prescription print, closing the deferred scope noted in PLAN057
-- ("no dedicated letterhead concept exists"). All columns nullable and
-- additive; an org/clinic/clinician that never sets any of these renders
-- exactly as before this migration.

-- ClientOrganizations: header tagline shown under the clinic/org name.
ALTER TABLE "ClientOrganizations" ADD COLUMN "tagline" TEXT;

-- Clinics: letterhead footer fields (website is new; address/city/postcode/
-- phone/email already existed) plus the ordered co-branding doctor list.
ALTER TABLE "Clinics" ADD COLUMN "website" TEXT;
ALTER TABLE "Clinics" ADD COLUMN "alternate_phone" TEXT;
ALTER TABLE "Clinics" ADD COLUMN "appointment_note" TEXT;
ALTER TABLE "Clinics" ADD COLUMN "letterhead_clinician_ids" JSONB;

-- Clinicians: bulleted sub-specialty/fellowship lines shown under the
-- existing short `qualifications` degree string.
ALTER TABLE "Clinicians" ADD COLUMN "specialty_highlights" TEXT;

-- Encounters: obstetric-specific LMP date. EDD and Gestational Age are
-- always computed at render time from this one column -- never stored.
ALTER TABLE "Encounters" ADD COLUMN "lmp_date" TIMESTAMP(3);
