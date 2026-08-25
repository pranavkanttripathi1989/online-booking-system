-- REQ031 (US-INS-02) -- payer-specific tariff master data.
--
-- Also reverts ClientOrganizations.whatsapp_sender_name/sms_sender_id,
-- added in the prior migration for a REQ025 (US-NOT-02) slice that turned
-- out to already be fully built: every registered notification provider
-- (msg91.provider.ts, gupshup.provider.ts, gupshup-whatsapp.provider.ts,
-- twilio.provider.ts) already collects its own sender identity as a
-- required credential field (sender_id / source+app_name / from_number),
-- admin-configured today via the existing NotificationProviderConfig
-- registry. A second, org-level "sender identity" column would have been
-- genuinely redundant, dead configuration nobody's dispatch code would
-- ever read -- caught before any resolver/frontend was built against it,
-- reverted the same session rather than shipped and left unused.

-- DropColumn (revert -- see note above)
ALTER TABLE "ClientOrganizations" DROP COLUMN "whatsapp_sender_name";
ALTER TABLE "ClientOrganizations" DROP COLUMN "sms_sender_id";

-- CreateTable
CREATE TABLE "PayerTariffs" (
    "id" TEXT NOT NULL,
    "payer_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "tariff_price" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayerTariffs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PayerTariffs_payer_id_product_id_key" ON "PayerTariffs"("payer_id", "product_id");

-- CreateIndex
CREATE INDEX "PayerTariffs_client_org_id_idx" ON "PayerTariffs"("client_org_id");

-- CreateIndex
CREATE INDEX "PayerTariffs_product_id_idx" ON "PayerTariffs"("product_id");

-- AddForeignKey
ALTER TABLE "PayerTariffs" ADD CONSTRAINT "PayerTariffs_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "Payers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayerTariffs" ADD CONSTRAINT "PayerTariffs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayerTariffs" ADD CONSTRAINT "PayerTariffs_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
