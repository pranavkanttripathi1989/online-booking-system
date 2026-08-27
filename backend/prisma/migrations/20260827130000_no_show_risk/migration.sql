-- P1-17 (no-show risk score) — reminder_count tracks how many
-- reminders have gone out per appointment (a high-risk appointment gets
-- an extra early reminder on top of the standard one).

ALTER TABLE "Appointments" ADD COLUMN "reminder_count" INTEGER NOT NULL DEFAULT 0;
