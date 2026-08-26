-- REQ113 — enables retention purge (RetentionPurgeService) to soft-delete
-- Consents rows, matching every other purgeable model's convention.
ALTER TABLE "Consents" ADD COLUMN "is_deleted" BOOLEAN NOT NULL DEFAULT false;
