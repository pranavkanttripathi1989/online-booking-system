-- REQ018 (Phase 1, slice 5) -- patient dedup + merge audit trail, and
-- family/dependant profiles, P0 subset.

CREATE TABLE "PatientRelations" (
  "id" TEXT NOT NULL,
  "patient_id" TEXT NOT NULL,
  "related_patient_id" TEXT NOT NULL,
  "relation" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PatientRelations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientRelations_patient_id_related_patient_id_key" ON "PatientRelations"("patient_id", "related_patient_id");
CREATE INDEX "PatientRelations_patient_id_idx" ON "PatientRelations"("patient_id");

ALTER TABLE "PatientRelations" ADD CONSTRAINT "PatientRelations_patient_id_fkey"
  FOREIGN KEY ("patient_id") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientRelations" ADD CONSTRAINT "PatientRelations_related_patient_id_fkey"
  FOREIGN KEY ("related_patient_id") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PatientMerges" (
  "id" TEXT NOT NULL,
  "surviving_patient_id" TEXT NOT NULL,
  "merged_patient_id" TEXT NOT NULL,
  "merged_by_user_id" TEXT,
  "reason" TEXT,
  "merged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PatientMerges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PatientMerges_surviving_patient_id_idx" ON "PatientMerges"("surviving_patient_id");
CREATE INDEX "PatientMerges_merged_patient_id_idx" ON "PatientMerges"("merged_patient_id");

ALTER TABLE "PatientMerges" ADD CONSTRAINT "PatientMerges_surviving_patient_id_fkey"
  FOREIGN KEY ("surviving_patient_id") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientMerges" ADD CONSTRAINT "PatientMerges_merged_patient_id_fkey"
  FOREIGN KEY ("merged_patient_id") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientMerges" ADD CONSTRAINT "PatientMerges_merged_by_user_id_fkey"
  FOREIGN KEY ("merged_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
