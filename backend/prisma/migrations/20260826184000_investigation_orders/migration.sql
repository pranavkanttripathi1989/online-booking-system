-- REQ127 (FR-EMR-08) — investigation orders reuse TestResults rather than a
-- parallel table: an "order" and a "result" are the same real-world row at
-- different points in its own status lifecycle (pending -> completed),
-- which TestResults.status already models. encounter_id is nullable
-- because most existing rows predate this and were never tied to a
-- specific consultation (walk-in lab work, the pre-existing standalone
-- orderTest() mutation).
ALTER TABLE "TestResults" ADD COLUMN "encounter_id" TEXT;
ALTER TABLE "TestResults" ADD COLUMN "urgency" TEXT NOT NULL DEFAULT 'routine';

CREATE INDEX "TestResults_encounter_id_idx" ON "TestResults"("encounter_id");

ALTER TABLE "TestResults" ADD CONSTRAINT "TestResults_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "Encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
