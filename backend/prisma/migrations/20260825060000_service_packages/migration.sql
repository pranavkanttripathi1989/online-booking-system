-- REQ054 (US-CAT-01) — multi-sitting service packages

-- CreateTable
CREATE TABLE "Packages" (
    "id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "total_sittings" INTEGER NOT NULL,
    "price_paise" INTEGER NOT NULL,
    "validity_days" INTEGER NOT NULL DEFAULT 90,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageItems" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,

    CONSTRAINT "PackageItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientPackages" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "sittings_total" INTEGER NOT NULL,
    "sittings_remaining" INTEGER NOT NULL,
    "purchase_amount_paise" INTEGER NOT NULL,
    "purchase_tender_type" TEXT NOT NULL,
    "purchase_reference" TEXT,
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PatientPackages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Packages_client_org_id_clinic_id_idx" ON "Packages"("client_org_id", "clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "PackageItems_package_id_product_id_key" ON "PackageItems"("package_id", "product_id");

-- CreateIndex
CREATE INDEX "PatientPackages_patient_id_expires_at_idx" ON "PatientPackages"("patient_id", "expires_at");

-- CreateIndex
CREATE INDEX "PatientPackages_client_org_id_clinic_id_idx" ON "PatientPackages"("client_org_id", "clinic_id");

-- AddForeignKey
ALTER TABLE "Packages" ADD CONSTRAINT "Packages_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Packages" ADD CONSTRAINT "Packages_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageItems" ADD CONSTRAINT "PackageItems_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "Packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageItems" ADD CONSTRAINT "PackageItems_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPackages" ADD CONSTRAINT "PatientPackages_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "Packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPackages" ADD CONSTRAINT "PatientPackages_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPackages" ADD CONSTRAINT "PatientPackages_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPackages" ADD CONSTRAINT "PatientPackages_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
