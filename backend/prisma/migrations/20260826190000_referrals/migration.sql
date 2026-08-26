-- REQ128 (FR-EMR-10) -- a clinician referring a patient onward to another
-- specialty/clinician from within a consultation. referred_to_clinician_id
-- is nullable: a referral to a specialty in general (e.g. "Cardiology") is
-- valid even with no specific in-org clinician named (e.g. referring out
-- of network). No client_org_id column, same reasoning as Diagnoses --
-- scoped entirely via the parent encounter, which already carries it.
CREATE TABLE "Referrals" (
  "id" TEXT NOT NULL,
  "encounter_id" TEXT NOT NULL,
  "patient_id" TEXT NOT NULL,
  "referred_to_specialty" TEXT NOT NULL,
  "referred_to_clinician_id" TEXT,
  "reason" TEXT NOT NULL,
  "urgency" TEXT NOT NULL DEFAULT 'routine',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Referrals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Referrals_encounter_id_idx" ON "Referrals"("encounter_id");
CREATE INDEX "Referrals_patient_id_idx" ON "Referrals"("patient_id");
CREATE INDEX "Referrals_referred_to_clinician_id_idx" ON "Referrals"("referred_to_clinician_id");

ALTER TABLE "Referrals" ADD CONSTRAINT "Referrals_encounter_id_fkey"
  FOREIGN KEY ("encounter_id") REFERENCES "Encounters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referrals" ADD CONSTRAINT "Referrals_patient_id_fkey"
  FOREIGN KEY ("patient_id") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Referrals" ADD CONSTRAINT "Referrals_referred_to_clinician_id_fkey"
  FOREIGN KEY ("referred_to_clinician_id") REFERENCES "Clinicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;
