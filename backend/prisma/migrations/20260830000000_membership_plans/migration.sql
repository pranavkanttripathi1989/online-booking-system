-- Patient Membership Plans -- built for real, replacing a page that was
-- previously 100% local useState with zero backend at all
-- (context/open-questions.md #13). Two new tables: MembershipPlans (an
-- org+clinic-scoped catalog, mirrors Packages) and PatientMemberships (a
-- per-patient enrollment record, mirrors PatientPackages, denormalizing
-- price_monthly_paise at enroll time). The partial unique index below is
-- the real "one active membership per patient" guarantee at the DB level --
-- enrollPatientMembership's own transaction cancels any prior active row
-- first, so this index is a safety net, not the primary mechanism.

CREATE TABLE "MembershipPlans" (
    "id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price_monthly_paise" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipPlans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatientMemberships" (
    "id" TEXT NOT NULL,
    "membership_plan_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "price_monthly_paise" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PatientMemberships_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MembershipPlans_client_org_id_clinic_id_idx" ON "MembershipPlans"("client_org_id", "clinic_id");
CREATE INDEX "PatientMemberships_patient_id_status_idx" ON "PatientMemberships"("patient_id", "status");
CREATE INDEX "PatientMemberships_client_org_id_clinic_id_idx" ON "PatientMemberships"("client_org_id", "clinic_id");

-- One active membership per patient, enforced at the DB level.
CREATE UNIQUE INDEX "PatientMemberships_patient_active_unique"
  ON "PatientMemberships" ("patient_id")
  WHERE "status" = 'active' AND "is_deleted" = false;

ALTER TABLE "MembershipPlans" ADD CONSTRAINT "MembershipPlans_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MembershipPlans" ADD CONSTRAINT "MembershipPlans_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PatientMemberships" ADD CONSTRAINT "PatientMemberships_membership_plan_id_fkey" FOREIGN KEY ("membership_plan_id") REFERENCES "MembershipPlans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientMemberships" ADD CONSTRAINT "PatientMemberships_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientMemberships" ADD CONSTRAINT "PatientMemberships_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientMemberships" ADD CONSTRAINT "PatientMemberships_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
