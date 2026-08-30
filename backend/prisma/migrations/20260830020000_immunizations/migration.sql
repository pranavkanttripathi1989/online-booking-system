-- REQ167 (P2-11) -- Immunisation schedule tracker. Two new tables:
-- ImmunizationScheduleItems (platform-global reference data, India's
-- National Immunization Schedule, seeded via seed.ts -- no client_org_id,
-- mirrors Drugs/Languages) and ImmunizationRecords (a patient-direct
-- clinical fact, patient_id mandatory, encounter_id optional, no direct
-- client_org_id/clinic_id -- scoped transitively via
-- patient_id -> Patients.client_org_id, mirroring TestResults exactly).

CREATE TABLE "ImmunizationScheduleItems" (
    "id" TEXT NOT NULL,
    "vaccine_name" TEXT NOT NULL,
    "dose_number" INTEGER NOT NULL,
    "due_age_days" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImmunizationScheduleItems_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImmunizationRecords" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "schedule_item_id" TEXT,
    "encounter_id" TEXT,
    "vaccine_name" TEXT NOT NULL,
    "dose_number" INTEGER NOT NULL,
    "administered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "administered_by_user_id" TEXT,
    "batch_no" TEXT,
    "site" TEXT,
    "notes" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImmunizationRecords_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImmunizationScheduleItems_is_active_due_age_days_idx" ON "ImmunizationScheduleItems"("is_active", "due_age_days");

CREATE INDEX "ImmunizationRecords_patient_id_administered_at_idx" ON "ImmunizationRecords"("patient_id", "administered_at");
CREATE INDEX "ImmunizationRecords_encounter_id_idx" ON "ImmunizationRecords"("encounter_id");
CREATE INDEX "ImmunizationRecords_schedule_item_id_idx" ON "ImmunizationRecords"("schedule_item_id");

ALTER TABLE "ImmunizationRecords" ADD CONSTRAINT "ImmunizationRecords_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImmunizationRecords" ADD CONSTRAINT "ImmunizationRecords_schedule_item_id_fkey" FOREIGN KEY ("schedule_item_id") REFERENCES "ImmunizationScheduleItems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImmunizationRecords" ADD CONSTRAINT "ImmunizationRecords_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "Encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImmunizationRecords" ADD CONSTRAINT "ImmunizationRecords_administered_by_user_id_fkey" FOREIGN KEY ("administered_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
