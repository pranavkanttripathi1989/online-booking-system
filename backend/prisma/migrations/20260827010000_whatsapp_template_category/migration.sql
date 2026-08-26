-- P1-01/REQ144: WhatsApp template-category routing + conversation metering.
-- Adds category + billing columns to NotificationSendLog so a per-tenant
-- conversation spend can be computed from the existing send-attempt log
-- rather than a new table, and a composite index for that aggregation.

ALTER TABLE "NotificationSendLog"
  ADD COLUMN "template_category" TEXT,
  ADD COLUMN "billable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "cost_micro_rupees" INTEGER;

CREATE INDEX "NotificationSendLog_client_org_id_channel_template_categor_idx"
  ON "NotificationSendLog" ("client_org_id", "channel", "template_category", "sent_at");
