-- Languages: is_default
ALTER TABLE "Languages" ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false;

-- EmailTemplates: variables (new column) + TemplateType enum realignment.
-- "EmailTemplates" is empty in every environment this migration will run against
-- (confirmed via SELECT COUNT(*) before writing this) and nothing in backend/src
-- references TemplateType at all, so a clean type-swap is safe here — no data to migrate.
ALTER TABLE "EmailTemplates" ADD COLUMN "variables" TEXT[] NOT NULL DEFAULT '{}';

ALTER TYPE "TemplateType" RENAME TO "TemplateType_old";
CREATE TYPE "TemplateType" AS ENUM (
  'appointment_confirmation',
  'appointment_reminder',
  'appointment_cancellation',
  'appointment_rescheduled',
  'password_reset',
  'welcome',
  'invoice',
  'cancellation_fee'
);
ALTER TABLE "EmailTemplates"
  ALTER COLUMN "template_type" TYPE "TemplateType"
  USING ("template_type"::text::"TemplateType");
DROP TYPE "TemplateType_old";

-- Clinicians: bio / avatar_url / consultation_fee
ALTER TABLE "Clinicians"
  ADD COLUMN "bio" TEXT,
  ADD COLUMN "avatar_url" TEXT,
  ADD COLUMN "consultation_fee" INTEGER;

-- CreateTable
CREATE TABLE "ClinicianServices" (
    "id" TEXT NOT NULL,
    "clinician_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicianServices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClinicianServices_clinician_id_product_id_key" ON "ClinicianServices"("clinician_id", "product_id");

-- AddForeignKey
ALTER TABLE "ClinicianServices" ADD CONSTRAINT "ClinicianServices_clinician_id_fkey" FOREIGN KEY ("clinician_id") REFERENCES "Clinicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicianServices" ADD CONSTRAINT "ClinicianServices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
