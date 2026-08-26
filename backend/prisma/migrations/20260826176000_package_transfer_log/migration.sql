-- REQ110 — append-only package transfer history.
CREATE TABLE "PackageTransferLog" (
    "id" TEXT NOT NULL,
    "patient_package_id" TEXT NOT NULL,
    "from_patient_id" TEXT NOT NULL,
    "to_patient_id" TEXT NOT NULL,
    "transferred_by_user_id" TEXT NOT NULL,
    "sittings_at_transfer" INTEGER NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackageTransferLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PackageTransferLog_patient_package_id_idx" ON "PackageTransferLog"("patient_package_id");
CREATE INDEX "PackageTransferLog_client_org_id_idx" ON "PackageTransferLog"("client_org_id");

ALTER TABLE "PackageTransferLog" ADD CONSTRAINT "PackageTransferLog_patient_package_id_fkey" FOREIGN KEY ("patient_package_id") REFERENCES "PatientPackages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PackageTransferLog" ADD CONSTRAINT "PackageTransferLog_from_patient_id_fkey" FOREIGN KEY ("from_patient_id") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PackageTransferLog" ADD CONSTRAINT "PackageTransferLog_to_patient_id_fkey" FOREIGN KEY ("to_patient_id") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
