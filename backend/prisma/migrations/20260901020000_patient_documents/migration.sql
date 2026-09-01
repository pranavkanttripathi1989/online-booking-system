-- REQ174 -- makes patients/detail.jsx's own pre-existing (fake, "demo
-- mode" local-state-only) Documents tab real. New table only, additive,
-- zero regression to any existing model.

-- CreateTable
CREATE TABLE "PatientDocuments" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "client_org_id" TEXT,
    "category" TEXT NOT NULL,
    "file_ref" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientDocuments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientDocuments_patient_id_is_deleted_idx" ON "PatientDocuments"("patient_id", "is_deleted");

-- AddForeignKey
ALTER TABLE "PatientDocuments" ADD CONSTRAINT "PatientDocuments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientDocuments" ADD CONSTRAINT "PatientDocuments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
