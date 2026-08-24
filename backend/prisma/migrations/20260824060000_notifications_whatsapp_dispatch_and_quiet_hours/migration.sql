-- REQ025 (US-NOT-01 remainder, US-NOT-04) -- WhatsApp channel-priority
-- dispatch fallback plus quiet-hours/frequency-cap guardrails.

ALTER TABLE "NotificationPreferences" ADD COLUMN "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "NotificationPreferences" ADD COLUMN "quiet_hours_start" TEXT;
ALTER TABLE "NotificationPreferences" ADD COLUMN "quiet_hours_end" TEXT;

CREATE TABLE "NotificationSendLog" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NotificationSendLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NotificationSendLog_user_id_sent_at_idx" ON "NotificationSendLog"("user_id", "sent_at");

ALTER TABLE "NotificationSendLog" ADD CONSTRAINT "NotificationSendLog_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
