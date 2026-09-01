-- REQ173 -- a clinician's own single-drug quick-pick list, distinct from
-- PrescriptionSets (a named multi-drug bundle/preset). Additive, new table
-- only; no existing column touched, zero regression.

-- CreateTable
CREATE TABLE "ClinicianFavouriteDrugs" (
    "id" TEXT NOT NULL,
    "clinician_id" TEXT NOT NULL,
    "drug_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicianFavouriteDrugs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClinicianFavouriteDrugs_clinician_id_drug_id_key" ON "ClinicianFavouriteDrugs"("clinician_id", "drug_id");

-- CreateIndex
CREATE INDEX "ClinicianFavouriteDrugs_clinician_id_idx" ON "ClinicianFavouriteDrugs"("clinician_id");

-- AddForeignKey
ALTER TABLE "ClinicianFavouriteDrugs" ADD CONSTRAINT "ClinicianFavouriteDrugs_clinician_id_fkey" FOREIGN KEY ("clinician_id") REFERENCES "Clinicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicianFavouriteDrugs" ADD CONSTRAINT "ClinicianFavouriteDrugs_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "Drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
