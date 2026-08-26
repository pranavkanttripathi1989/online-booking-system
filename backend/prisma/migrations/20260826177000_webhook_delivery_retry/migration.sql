-- REQ112 — webhook delivery retry tracking.
ALTER TABLE "WebhookDeliveryLog" ADD COLUMN "attempt_number" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "WebhookDeliveryLog" ADD COLUMN "next_retry_at" TIMESTAMP(3);
CREATE INDEX "WebhookDeliveryLog_status_next_retry_at_idx" ON "WebhookDeliveryLog"("status", "next_retry_at");
