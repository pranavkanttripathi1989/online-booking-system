-- REQ020 (Phase 1, slice 2) -- consultation workspace / clinical records
-- (EMR), P0 subset: structured notes, addenda, diagnoses/allergies,
-- attachments, templates, and sign-off immutability enforced by trigger.

-- Encounters: one per Appointment. client_org_id is its own column
-- (denormalized from the appointment's clinic at creation) because
-- Patients has no client_org_id column of its own -- same reasoning as
-- Resources (REQ017).
CREATE TABLE "Encounters" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "appointment_id" TEXT NOT NULL,
  "patient_id" TEXT NOT NULL,
  "clinician_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'in_progress',
  "locked" BOOLEAN NOT NULL DEFAULT false,
  "signed_at" TIMESTAMP(3),
  "signed_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Encounters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Encounters_appointment_id_key" ON "Encounters"("appointment_id");
CREATE INDEX "Encounters_client_org_id_patient_id_idx" ON "Encounters"("client_org_id", "patient_id");
CREATE INDEX "Encounters_clinician_id_idx" ON "Encounters"("clinician_id");
CREATE INDEX "Encounters_patient_id_created_at_idx" ON "Encounters"("patient_id", "created_at");

ALTER TABLE "Encounters" ADD CONSTRAINT "Encounters_client_org_id_fkey"
  FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Encounters" ADD CONSTRAINT "Encounters_appointment_id_fkey"
  FOREIGN KEY ("appointment_id") REFERENCES "Appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Encounters" ADD CONSTRAINT "Encounters_patient_id_fkey"
  FOREIGN KEY ("patient_id") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Encounters" ADD CONSTRAINT "Encounters_clinician_id_fkey"
  FOREIGN KEY ("clinician_id") REFERENCES "Clinicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Encounters" ADD CONSTRAINT "Encounters_signed_by_id_fkey"
  FOREIGN KEY ("signed_by_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- EncounterNotes: one row per structured section per encounter, upserted.
-- "vitals" is one of the section values here, not a separate discrete-
-- reading table this slice (see REQ020's own plan for why).
CREATE TABLE "EncounterNotes" (
  "id" TEXT NOT NULL,
  "encounter_id" TEXT NOT NULL,
  "section" TEXT NOT NULL,
  "content" TEXT NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EncounterNotes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EncounterNotes_encounter_id_section_key" ON "EncounterNotes"("encounter_id", "section");

ALTER TABLE "EncounterNotes" ADD CONSTRAINT "EncounterNotes_encounter_id_fkey"
  FOREIGN KEY ("encounter_id") REFERENCES "Encounters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- EncounterAddenda: append-only. The only way to add information to a
-- signed (locked) encounter -- never updated or deleted, so no trigger.
CREATE TABLE "EncounterAddenda" (
  "id" TEXT NOT NULL,
  "encounter_id" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EncounterAddenda_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EncounterAddenda_encounter_id_created_at_idx" ON "EncounterAddenda"("encounter_id", "created_at");

ALTER TABLE "EncounterAddenda" ADD CONSTRAINT "EncounterAddenda_encounter_id_fkey"
  FOREIGN KEY ("encounter_id") REFERENCES "Encounters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EncounterAddenda" ADD CONSTRAINT "EncounterAddenda_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Diagnoses: also backs the allergy banner (type='allergy'), queried across
-- every encounter for the patient -- see REQ020's plan for why there is no
-- separate Allergies table.
CREATE TABLE "Diagnoses" (
  "id" TEXT NOT NULL,
  "encounter_id" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'diagnosis',
  "icd10_code" TEXT,
  "text" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Diagnoses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Diagnoses_encounter_id_idx" ON "Diagnoses"("encounter_id");

ALTER TABLE "Diagnoses" ADD CONSTRAINT "Diagnoses_encounter_id_fkey"
  FOREIGN KEY ("encounter_id") REFERENCES "Encounters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Attachments: file_ref is a local-filesystem URL under /uploads/attachments/,
-- written by a REST controller mirroring org-branding.controller.ts's
-- two-step upload/persist split.
CREATE TABLE "Attachments" (
  "id" TEXT NOT NULL,
  "encounter_id" TEXT NOT NULL,
  "file_ref" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "original_filename" TEXT NOT NULL,
  "uploaded_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Attachments_encounter_id_idx" ON "Attachments"("encounter_id");

ALTER TABLE "Attachments" ADD CONSTRAINT "Attachments_encounter_id_fkey"
  FOREIGN KEY ("encounter_id") REFERENCES "Encounters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attachments" ADD CONSTRAINT "Attachments_uploaded_by_id_fkey"
  FOREIGN KEY ("uploaded_by_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- EncounterTemplates: one-click favourites. clinician_id set means a
-- personal favourite; null means org-shared. client_org_id nullable to
-- allow a future platform-seeded default set with no owning org.
CREATE TABLE "EncounterTemplates" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT,
  "clinician_id" TEXT,
  "specialty" TEXT,
  "name" TEXT NOT NULL,
  "sections_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EncounterTemplates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EncounterTemplates_client_org_id_idx" ON "EncounterTemplates"("client_org_id");
CREATE INDEX "EncounterTemplates_clinician_id_idx" ON "EncounterTemplates"("clinician_id");

ALTER TABLE "EncounterTemplates" ADD CONSTRAINT "EncounterTemplates_client_org_id_fkey"
  FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EncounterTemplates" ADD CONSTRAINT "EncounterTemplates_clinician_id_fkey"
  FOREIGN KEY ("clinician_id") REFERENCES "Clinicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sign-off immutability (US-EMR-06 / PRD S14.2): "write-protected by
-- trigger", not just an application-layer check. Once Encounters.locked is
-- true, any UPDATE or DELETE against that encounter's EncounterNotes or
-- Diagnoses rows is rejected at the database layer -- this holds even if a
-- future code path forgets the app-level guard. First triggers in this
-- codebase (confirmed zero pre-existing via grep).
CREATE FUNCTION reject_write_if_encounter_locked() RETURNS trigger AS $$
DECLARE
  is_locked BOOLEAN;
  target_encounter_id TEXT;
BEGIN
  target_encounter_id := COALESCE(OLD.encounter_id, NEW.encounter_id);
  SELECT "locked" INTO is_locked FROM "Encounters" WHERE "id" = target_encounter_id;
  IF is_locked THEN
    RAISE EXCEPTION 'Cannot modify % on a signed (locked) encounter %', TG_TABLE_NAME, target_encounter_id;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER encounter_notes_lock_guard
  BEFORE UPDATE OR DELETE ON "EncounterNotes"
  FOR EACH ROW EXECUTE FUNCTION reject_write_if_encounter_locked();

CREATE TRIGGER diagnoses_lock_guard
  BEFORE UPDATE OR DELETE ON "Diagnoses"
  FOR EACH ROW EXECUTE FUNCTION reject_write_if_encounter_locked();
