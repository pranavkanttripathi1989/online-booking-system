-- REQ168 (P2-12) -- Chronic-disease registries (diabetes/HTN) + recall.
-- ChronicRegistryEnrollments is a patient-direct clinical fact mirroring
-- TestResults/ImmunizationRecords: patient_id mandatory, no direct
-- client_org_id/clinic_id -- scoped transitively via
-- patient_id -> Patients.client_org_id.

CREATE TYPE "ChronicConditionType" AS ENUM ('diabetes', 'hypertension');

CREATE TABLE "ChronicRegistryEnrollments" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "condition" "ChronicConditionType" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enrolled_by_user_id" TEXT,
    "last_reviewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ChronicRegistryEnrollments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChronicRegistryEnrollments_patient_id_condition_key" ON "ChronicRegistryEnrollments"("patient_id", "condition");
CREATE INDEX "ChronicRegistryEnrollments_patient_id_idx" ON "ChronicRegistryEnrollments"("patient_id");
CREATE INDEX "ChronicRegistryEnrollments_status_last_reviewed_at_idx" ON "ChronicRegistryEnrollments"("status", "last_reviewed_at");

ALTER TABLE "ChronicRegistryEnrollments" ADD CONSTRAINT "ChronicRegistryEnrollments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChronicRegistryEnrollments" ADD CONSTRAINT "ChronicRegistryEnrollments_enrolled_by_user_id_fkey" FOREIGN KEY ("enrolled_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
