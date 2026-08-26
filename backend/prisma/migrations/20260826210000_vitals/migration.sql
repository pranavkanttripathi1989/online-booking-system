-- REQ130 (FR-EMR-05) -- one row per discrete vital-sign reading (a
-- code/value/unit shape, matching the requirement's own Data Model Impact
-- section), so a growth chart can query one code (e.g. weight_kg) across
-- every encounter for a patient without a schema change per new vital
-- type. No patient_id column -- scoped entirely via the parent encounter,
-- same reasoning as Diagnoses/Referrals.
CREATE TABLE "Vitals" (
  "id" TEXT NOT NULL,
  "encounter_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL,
  "recorded_by_user_id" TEXT NOT NULL,
  "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Vitals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Vitals_encounter_id_idx" ON "Vitals"("encounter_id");
CREATE INDEX "Vitals_code_idx" ON "Vitals"("code");

ALTER TABLE "Vitals" ADD CONSTRAINT "Vitals_encounter_id_fkey"
  FOREIGN KEY ("encounter_id") REFERENCES "Encounters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Vitals" ADD CONSTRAINT "Vitals_recorded_by_user_id_fkey"
  FOREIGN KEY ("recorded_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
