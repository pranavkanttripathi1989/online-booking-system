-- REQ107 — QR self-check-in. Same shape as Users.password_reset_token/
-- password_reset_expires: only a SHA-256 hash is stored, never the raw
-- token. Postgres allows multiple NULLs under a UNIQUE index (the common
-- case — most appointments never get one, or the token is later cleared
-- to a fresh NULL... actually never cleared to NULL, only checkin_token_used_at
-- is stamped, so the hash column keeps its value after use for audit purposes).

ALTER TABLE "Appointments" ADD COLUMN "checkin_token_hash" TEXT;
ALTER TABLE "Appointments" ADD COLUMN "checkin_token_expires_at" TIMESTAMP(3);
ALTER TABLE "Appointments" ADD COLUMN "checkin_token_used_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "Appointments_checkin_token_hash_key" ON "Appointments"("checkin_token_hash");
