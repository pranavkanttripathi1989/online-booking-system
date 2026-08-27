-- P1-11 (AI clinical intelligence) — provider config, transcription
-- sessions, and the AI-derived flagging columns on EncounterNotes/Vitals.

CREATE TABLE "AiProviderConfig" (
    "id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'transcription',
    "provider" TEXT NOT NULL,
    "credentials_encrypted" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiProviderConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiProviderConfig_client_org_id_purpose_key" ON "AiProviderConfig"("client_org_id", "purpose");

ALTER TABLE "AiProviderConfig" ADD CONSTRAINT "AiProviderConfig_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AiTranscriptionSessions" (
    "id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "encounter_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "consented_by_user_id" TEXT NOT NULL,
    "consented_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_consent',
    "provider" TEXT,
    "raw_transcript" TEXT,
    "duration_seconds" INTEGER,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiTranscriptionSessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiTranscriptionSessions_client_org_id_created_at_idx" ON "AiTranscriptionSessions"("client_org_id", "created_at");
CREATE INDEX "AiTranscriptionSessions_encounter_id_idx" ON "AiTranscriptionSessions"("encounter_id");

ALTER TABLE "AiTranscriptionSessions" ADD CONSTRAINT "AiTranscriptionSessions_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiTranscriptionSessions" ADD CONSTRAINT "AiTranscriptionSessions_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "Encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiTranscriptionSessions" ADD CONSTRAINT "AiTranscriptionSessions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiTranscriptionSessions" ADD CONSTRAINT "AiTranscriptionSessions_consented_by_user_id_fkey" FOREIGN KEY ("consented_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EncounterNotes" ADD COLUMN "ai_generated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EncounterNotes" ADD COLUMN "ai_source_session_id" TEXT;

ALTER TABLE "Vitals" ADD COLUMN "ai_generated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Vitals" ADD COLUMN "ai_source_session_id" TEXT;
