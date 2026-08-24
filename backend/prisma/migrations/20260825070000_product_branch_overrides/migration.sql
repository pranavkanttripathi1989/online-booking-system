-- REQ055 (US-ORG-05) — org->branch masters cascade for services

-- CreateTable
CREATE TABLE "ProductBranchOverrides" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "client_org_id" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'inherit',
    "override_price" INTEGER,
    "override_category_pricing_json" JSONB,
    "override_channel_pricing_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductBranchOverrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductBranchOverrides_product_id_clinic_id_key" ON "ProductBranchOverrides"("product_id", "clinic_id");

-- CreateIndex
CREATE INDEX "ProductBranchOverrides_client_org_id_idx" ON "ProductBranchOverrides"("client_org_id");

-- CreateIndex
CREATE INDEX "ProductBranchOverrides_clinic_id_idx" ON "ProductBranchOverrides"("clinic_id");

-- AddForeignKey
ALTER TABLE "ProductBranchOverrides" ADD CONSTRAINT "ProductBranchOverrides_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBranchOverrides" ADD CONSTRAINT "ProductBranchOverrides_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBranchOverrides" ADD CONSTRAINT "ProductBranchOverrides_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
