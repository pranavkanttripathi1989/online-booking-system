-- REQ005 (Settings) Notifications tab: real per-user, per-event-type
-- preference storage. Nothing in the codebase currently reads these to
-- decide whether to send anything (see context/open-questions.md) -- this
-- is storage only, matching the DB-normalization precedent set elsewhere
-- in this schema rather than a JSON blob.

-- CreateEnum
CREATE TYPE "NotificationEventType" AS ENUM (
  'new_appointment',
  'appointment_reminder',
  'appointment_cancelled',
  'new_message',
  'new_review',
  'payment_received',
  'system_announcement'
);

-- CreateTable
CREATE TABLE "NotificationPreferences" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "event_type" "NotificationEventType" NOT NULL,
  "email_enabled" BOOLEAN NOT NULL DEFAULT true,
  "sms_enabled" BOOLEAN NOT NULL DEFAULT false,
  "app_enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NotificationPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreferences_user_id_event_type_key" ON "NotificationPreferences"("user_id", "event_type");

-- AddForeignKey
ALTER TABLE "NotificationPreferences" ADD CONSTRAINT "NotificationPreferences_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
