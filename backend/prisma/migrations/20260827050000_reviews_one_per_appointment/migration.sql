-- P1-06: one review per appointment. Replaces the plain appointment_id
-- index (a unique index serves the same lookup purpose).
DROP INDEX IF EXISTS "Reviews_appointment_id_idx";
CREATE UNIQUE INDEX "Reviews_appointment_id_key" ON "Reviews"("appointment_id");
