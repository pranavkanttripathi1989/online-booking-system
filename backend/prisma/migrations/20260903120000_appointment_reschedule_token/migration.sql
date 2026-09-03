-- P2-16 — self-serve reschedule link in every reminder. Same shape as
-- checkin_token_hash/checkin_token_expires_at/checkin_token_used_at
-- (REQ107, 20260826181000_appointment_checkin_token): only a SHA-256 hash
-- is ever persisted, never the raw token. Minted by
-- AppointmentReminderSweepService at reminder-send time, not at booking
-- time — see appointments.service.ts's generateRescheduleToken().

ALTER TABLE "Appointments" ADD COLUMN "reschedule_token_hash" TEXT;
ALTER TABLE "Appointments" ADD COLUMN "reschedule_token_expires_at" TIMESTAMP(3);
ALTER TABLE "Appointments" ADD COLUMN "reschedule_token_used_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "Appointments_reschedule_token_hash_key" ON "Appointments"("reschedule_token_hash");
