-- REQ021 (Phase 1, slice 3) -- prescription builder, print view, and
-- repeat-Rx, P0 subset.

ALTER TABLE "Clinicians" ADD COLUMN "registration_number" TEXT;
ALTER TABLE "Clinicians" ADD COLUMN "qualifications" TEXT;

-- Prescriptions: issued from within an Encounter. No client_org_id of its
-- own -- scoped indirectly via encounter.client_org_id, same reasoning as
-- every other model hanging off Encounters. Never updated after creation,
-- so no lock/trigger needed the way Encounters has.
CREATE TABLE "Prescriptions" (
  "id" TEXT NOT NULL,
  "encounter_id" TEXT NOT NULL,
  "patient_id" TEXT NOT NULL,
  "clinician_id" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'in_person',
  "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "language" TEXT NOT NULL DEFAULT 'en',
  "repeated_from_id" TEXT,
  "reprint_count" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "Prescriptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Prescriptions_patient_id_issued_at_idx" ON "Prescriptions"("patient_id", "issued_at");
CREATE INDEX "Prescriptions_encounter_id_idx" ON "Prescriptions"("encounter_id");

ALTER TABLE "Prescriptions" ADD CONSTRAINT "Prescriptions_encounter_id_fkey"
  FOREIGN KEY ("encounter_id") REFERENCES "Encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Prescriptions" ADD CONSTRAINT "Prescriptions_patient_id_fkey"
  FOREIGN KEY ("patient_id") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Prescriptions" ADD CONSTRAINT "Prescriptions_clinician_id_fkey"
  FOREIGN KEY ("clinician_id") REFERENCES "Clinicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Prescriptions" ADD CONSTRAINT "Prescriptions_repeated_from_id_fkey"
  FOREIGN KEY ("repeated_from_id") REFERENCES "Prescriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PrescriptionItems" (
  "id" TEXT NOT NULL,
  "prescription_id" TEXT NOT NULL,
  "drug_id" TEXT NOT NULL,
  "dose" TEXT NOT NULL,
  "frequency" TEXT NOT NULL,
  "route" TEXT,
  "duration_days" INTEGER,
  "qty" INTEGER,
  "instructions" TEXT,
  "substitutable" BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT "PrescriptionItems_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PrescriptionItems_prescription_id_idx" ON "PrescriptionItems"("prescription_id");

ALTER TABLE "PrescriptionItems" ADD CONSTRAINT "PrescriptionItems_prescription_id_fkey"
  FOREIGN KEY ("prescription_id") REFERENCES "Prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrescriptionItems" ADD CONSTRAINT "PrescriptionItems_drug_id_fkey"
  FOREIGN KEY ("drug_id") REFERENCES "Drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- US-RX-02: saved drug-set favourites, mirroring EncounterTemplates' exact
-- shape -- the requirement's own Data Model Impact section lists no
-- favourites table at all, the identical gap EncounterTemplates had.
CREATE TABLE "PrescriptionSets" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT,
  "clinician_id" TEXT,
  "specialty" TEXT,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PrescriptionSets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PrescriptionSets_client_org_id_idx" ON "PrescriptionSets"("client_org_id");
CREATE INDEX "PrescriptionSets_clinician_id_idx" ON "PrescriptionSets"("clinician_id");

ALTER TABLE "PrescriptionSets" ADD CONSTRAINT "PrescriptionSets_client_org_id_fkey"
  FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PrescriptionSets" ADD CONSTRAINT "PrescriptionSets_clinician_id_fkey"
  FOREIGN KEY ("clinician_id") REFERENCES "Clinicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PrescriptionSetItems" (
  "id" TEXT NOT NULL,
  "prescription_set_id" TEXT NOT NULL,
  "drug_id" TEXT NOT NULL,
  "dose" TEXT NOT NULL,
  "frequency" TEXT NOT NULL,
  "route" TEXT,
  "duration_days" INTEGER,
  "instructions" TEXT,

  CONSTRAINT "PrescriptionSetItems_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PrescriptionSetItems_prescription_set_id_idx" ON "PrescriptionSetItems"("prescription_set_id");

ALTER TABLE "PrescriptionSetItems" ADD CONSTRAINT "PrescriptionSetItems_prescription_set_id_fkey"
  FOREIGN KEY ("prescription_set_id") REFERENCES "PrescriptionSets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrescriptionSetItems" ADD CONSTRAINT "PrescriptionSetItems_drug_id_fkey"
  FOREIGN KEY ("drug_id") REFERENCES "Drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
