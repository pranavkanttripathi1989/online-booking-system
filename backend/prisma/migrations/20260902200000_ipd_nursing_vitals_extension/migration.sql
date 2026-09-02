-- REQ179 (IPD slice 2) -- extends Vitals to also cover an admission (IPD
-- stay), rather than a parallel IpdVitals table. Audited before this change
-- (fork research, this slice's own PLAN doc): no resolver dereferences
-- .encounter_id directly, and the frontend's own GraphQL selections never
-- request it, so every pre-existing row and every pre-existing query
-- continues to work unchanged -- this is additive, not breaking.

ALTER TABLE "Vitals" ALTER COLUMN "encounter_id" DROP NOT NULL;
ALTER TABLE "Vitals" ADD COLUMN "admission_id" TEXT;
ALTER TABLE "Vitals" ADD COLUMN "shift" TEXT;

-- Every pre-existing row has encounter_id set and admission_id NULL, so
-- satisfies this unchanged.
ALTER TABLE "Vitals" ADD CONSTRAINT "vitals_exactly_one_parent"
  CHECK (num_nonnulls(encounter_id, admission_id) = 1);

ALTER TABLE "Vitals" ADD CONSTRAINT "Vitals_admission_id_fkey"
  FOREIGN KEY ("admission_id") REFERENCES "Admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Vitals_admission_id_recorded_at_idx" ON "Vitals"("admission_id", "recorded_at");
