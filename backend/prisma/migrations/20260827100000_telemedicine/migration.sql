-- P1-16 (real telemedicine) — consultation_mode denormalized onto
-- Encounters, TPG list classification on Drugs, escalation link on
-- Appointments, and the TelemedicineSessions table itself.

ALTER TABLE "Encounters" ADD COLUMN "consultation_mode" TEXT NOT NULL DEFAULT 'in_person';

ALTER TABLE "Drugs" ADD COLUMN "tpg_list" TEXT;
-- The one backfill direction that's genuinely unambiguous: an
-- over-the-counter drug is List O (safe for any teleconsultation mode).
-- Everything else stays NULL — unclassified, fail-closed — until an
-- admin reviews it against the real published TPG annexures.
UPDATE "Drugs" SET "tpg_list" = 'O' WHERE "schedule_class" = 'OTC';

ALTER TABLE "Appointments" ADD COLUMN "escalated_from_encounter_id" TEXT;
CREATE INDEX "Appointments_escalated_from_encounter_id_idx" ON "Appointments"("escalated_from_encounter_id");
ALTER TABLE "Appointments" ADD CONSTRAINT "Appointments_escalated_from_encounter_id_fkey" FOREIGN KEY ("escalated_from_encounter_id") REFERENCES "Encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "TelemedicineSessions" (
    "id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "encounter_id" TEXT NOT NULL,
    "room_name" TEXT NOT NULL,
    "room_url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3) NOT NULL,
    "recording_consent_at" TIMESTAMP(3),
    "recording_consent_by_user_id" TEXT,
    "recording_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelemedicineSessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TelemedicineSessions_encounter_id_key" ON "TelemedicineSessions"("encounter_id");
CREATE UNIQUE INDEX "TelemedicineSessions_room_name_key" ON "TelemedicineSessions"("room_name");
CREATE INDEX "TelemedicineSessions_client_org_id_created_at_idx" ON "TelemedicineSessions"("client_org_id", "created_at");

ALTER TABLE "TelemedicineSessions" ADD CONSTRAINT "TelemedicineSessions_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TelemedicineSessions" ADD CONSTRAINT "TelemedicineSessions_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "Encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TelemedicineSessions" ADD CONSTRAINT "TelemedicineSessions_recording_consent_by_user_id_fkey" FOREIGN KEY ("recording_consent_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
