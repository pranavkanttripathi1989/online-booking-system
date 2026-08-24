-- REQ052 (US-BOOK-04/US-BOOK-06) — auto-no-show sweep + configurable intake fields

-- AlterTable
ALTER TABLE "ClientOrganizations" ADD COLUMN     "no_show_grace_minutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "no_show_prepayment_threshold" INTEGER NOT NULL DEFAULT 3;

-- AlterTable
ALTER TABLE "Patients" ADD COLUMN     "no_show_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Appointments" ADD COLUMN     "intake_responses" JSONB;

-- CreateTable
CREATE TABLE "ClinicIntakeFieldConfig" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "product_id" TEXT,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "field_type" TEXT NOT NULL DEFAULT 'text',
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicIntakeFieldConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClinicIntakeFieldConfig_clinic_id_product_id_idx" ON "ClinicIntakeFieldConfig"("clinic_id", "product_id");

-- AddForeignKey
ALTER TABLE "ClinicIntakeFieldConfig" ADD CONSTRAINT "ClinicIntakeFieldConfig_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicIntakeFieldConfig" ADD CONSTRAINT "ClinicIntakeFieldConfig_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
