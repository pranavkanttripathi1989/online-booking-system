-- REQ016 (US-CAT-05 price audit), REQ022 (US-PHR-09 low-stock threshold),
-- REQ024 (US-MSG-04 clinical hours auto-responder), REQ025 (US-NOT-02
-- sender identity, US-NOT-05 delivery analytics), REQ034 (US-DPDP-06
-- retention policies) -- schema changes for this batch's 8 slices.

-- AlterTable: ClientOrganizations -- sender identity + clinical hours
ALTER TABLE "ClientOrganizations" ADD COLUMN "whatsapp_sender_name" TEXT;
ALTER TABLE "ClientOrganizations" ADD COLUMN "sms_sender_id" TEXT;
ALTER TABLE "ClientOrganizations" ADD COLUMN "clinical_hours_start" TEXT;
ALTER TABLE "ClientOrganizations" ADD COLUMN "clinical_hours_end" TEXT;
ALTER TABLE "ClientOrganizations" ADD COLUMN "clinical_hours_auto_reply_message" TEXT;

-- AlterTable: Drugs -- low-stock reorder threshold
ALTER TABLE "Drugs" ADD COLUMN "reorder_level" INTEGER;

-- AlterTable: NotificationSendLog -- log failures too, not just successes
ALTER TABLE "NotificationSendLog" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'sent';
ALTER TABLE "NotificationSendLog" ADD COLUMN "error_message" TEXT;
ALTER TABLE "NotificationSendLog" ADD COLUMN "client_org_id" TEXT;

-- CreateIndex
CREATE INDEX "NotificationSendLog_client_org_id_event_type_sent_at_idx" ON "NotificationSendLog"("client_org_id", "event_type", "sent_at");

-- CreateTable: PriceHistory
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "client_org_id" TEXT,
    "old_price" INTEGER,
    "new_price" INTEGER NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied" BOOLEAN NOT NULL DEFAULT true,
    "changed_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceHistory_product_id_created_at_idx" ON "PriceHistory"("product_id", "created_at");

-- CreateIndex
CREATE INDEX "PriceHistory_applied_effective_from_idx" ON "PriceHistory"("applied", "effective_from");

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: RetentionPolicies
CREATE TABLE "RetentionPolicies" (
    "id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "data_class" TEXT NOT NULL,
    "retention_years" INTEGER NOT NULL,
    "legal_hold" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetentionPolicies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RetentionPolicies_client_org_id_data_class_key" ON "RetentionPolicies"("client_org_id", "data_class");

-- CreateIndex
CREATE INDEX "RetentionPolicies_client_org_id_idx" ON "RetentionPolicies"("client_org_id");

-- AddForeignKey
ALTER TABLE "RetentionPolicies" ADD CONSTRAINT "RetentionPolicies_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
