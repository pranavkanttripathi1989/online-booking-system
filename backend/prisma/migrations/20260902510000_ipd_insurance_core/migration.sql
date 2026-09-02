-- REQ179 (IPD slice 5) -- TPA cashless: pre-authorization, mid-stay
-- enhancement, claim reconciliation with line-level disallowance. Hand-
-- written per this repo's standing convention (prisma migrate dev cannot
-- run non-interactively here). Payers/PayerTariffs/PayerEmpanelments/
-- PatientInsurancePolicies are NOT touched by this migration at all --
-- REQ031's own reuse decision, zero schema change, confirmed by this
-- file's own diff.

-- ============================================================
-- PreAuthorizations -- created first since PreAuthEnhancements,
-- IpdClaims and IpdInsuranceDocuments all FK to it.
-- ============================================================
CREATE TABLE "PreAuthorizations" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "patient_id" TEXT NOT NULL,
  "payer_id" TEXT NOT NULL,
  "policy_id" TEXT,
  "admission_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'requested',
  "requested_amount_paise" INTEGER NOT NULL,
  "approved_amount_paise" INTEGER,
  "preauth_number" TEXT,
  "diagnosis_codes_json" JSONB,
  "procedure_codes_json" JSONB,
  "valid_until" TIMESTAMP(3),
  "rejection_reason" TEXT,
  "notes" TEXT,
  "requested_by_user_id" TEXT NOT NULL,
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decided_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PreAuthorizations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PreAuthorizations_admission_id_key" ON "PreAuthorizations"("admission_id");
CREATE INDEX "PreAuthorizations_client_org_id_clinic_id_status_idx" ON "PreAuthorizations"("client_org_id", "clinic_id", "status");
CREATE INDEX "PreAuthorizations_patient_id_idx" ON "PreAuthorizations"("patient_id");

-- ============================================================
-- PreAuthEnhancements
-- ============================================================
CREATE TABLE "PreAuthEnhancements" (
  "id" TEXT NOT NULL,
  "preauth_id" TEXT NOT NULL,
  "sequence_no" INTEGER NOT NULL,
  "requested_amount_paise" INTEGER NOT NULL,
  "approved_amount_paise" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'requested',
  "bill_amount_at_request_paise" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "rejection_reason" TEXT,
  "requested_by_user_id" TEXT NOT NULL,
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decided_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PreAuthEnhancements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PreAuthEnhancements_preauth_id_sequence_no_key" ON "PreAuthEnhancements"("preauth_id", "sequence_no");

-- ============================================================
-- IpdClaims -- one per admission.
-- ============================================================
CREATE TABLE "IpdClaims" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "admission_id" TEXT NOT NULL,
  "preauth_id" TEXT,
  "patient_id" TEXT NOT NULL,
  "payer_id" TEXT NOT NULL,
  "policy_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "claimed_amount_paise" INTEGER NOT NULL,
  "approved_amount_paise" INTEGER,
  "claim_number" TEXT,
  "rejection_reason" TEXT,
  "notes" TEXT,
  "submitted_by_user_id" TEXT,
  "submitted_at" TIMESTAMP(3),
  "decided_at" TIMESTAMP(3),
  "settled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IpdClaims_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IpdClaims_admission_id_key" ON "IpdClaims"("admission_id");
CREATE UNIQUE INDEX "IpdClaims_preauth_id_key" ON "IpdClaims"("preauth_id");
CREATE INDEX "IpdClaims_client_org_id_clinic_id_status_idx" ON "IpdClaims"("client_org_id", "clinic_id", "status");
CREATE INDEX "IpdClaims_payer_id_idx" ON "IpdClaims"("payer_id");
CREATE INDEX "IpdClaims_patient_id_idx" ON "IpdClaims"("patient_id");

-- ============================================================
-- IpdClaimDeductions -- line-level disallowance, the thing the
-- pre-existing Claims model structurally cannot express.
-- ============================================================
CREATE TABLE "IpdClaimDeductions" (
  "id" TEXT NOT NULL,
  "claim_id" TEXT NOT NULL,
  "charge_id" TEXT,
  "description" TEXT NOT NULL,
  "deducted_amount_paise" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IpdClaimDeductions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "IpdClaimDeductions_claim_id_idx" ON "IpdClaimDeductions"("claim_id");

-- ============================================================
-- IpdInsuranceDocuments -- exactly one of preauth_id/claim_id set.
-- ============================================================
CREATE TABLE "IpdInsuranceDocuments" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "preauth_id" TEXT,
  "claim_id" TEXT,
  "document_type" TEXT NOT NULL,
  "file_ref" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "notes" TEXT,
  "uploaded_by_user_id" TEXT NOT NULL,
  "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IpdInsuranceDocuments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ipd_insurance_documents_exactly_one_parent"
    CHECK (num_nonnulls("preauth_id", "claim_id") = 1)
);
CREATE INDEX "IpdInsuranceDocuments_preauth_id_idx" ON "IpdInsuranceDocuments"("preauth_id");
CREATE INDEX "IpdInsuranceDocuments_claim_id_idx" ON "IpdInsuranceDocuments"("claim_id");

-- ============================================================
-- Foreign keys
-- ============================================================
ALTER TABLE "PreAuthorizations" ADD CONSTRAINT "PreAuthorizations_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PreAuthorizations" ADD CONSTRAINT "PreAuthorizations_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PreAuthorizations" ADD CONSTRAINT "PreAuthorizations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PreAuthorizations" ADD CONSTRAINT "PreAuthorizations_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "Payers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PreAuthorizations" ADD CONSTRAINT "PreAuthorizations_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "PatientInsurancePolicies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PreAuthorizations" ADD CONSTRAINT "PreAuthorizations_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "Admissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PreAuthorizations" ADD CONSTRAINT "PreAuthorizations_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PreAuthEnhancements" ADD CONSTRAINT "PreAuthEnhancements_preauth_id_fkey" FOREIGN KEY ("preauth_id") REFERENCES "PreAuthorizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PreAuthEnhancements" ADD CONSTRAINT "PreAuthEnhancements_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "IpdClaims" ADD CONSTRAINT "IpdClaims_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IpdClaims" ADD CONSTRAINT "IpdClaims_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IpdClaims" ADD CONSTRAINT "IpdClaims_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "Admissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IpdClaims" ADD CONSTRAINT "IpdClaims_preauth_id_fkey" FOREIGN KEY ("preauth_id") REFERENCES "PreAuthorizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IpdClaims" ADD CONSTRAINT "IpdClaims_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IpdClaims" ADD CONSTRAINT "IpdClaims_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "Payers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IpdClaims" ADD CONSTRAINT "IpdClaims_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "PatientInsurancePolicies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IpdClaims" ADD CONSTRAINT "IpdClaims_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "IpdClaimDeductions" ADD CONSTRAINT "IpdClaimDeductions_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "IpdClaims"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IpdClaimDeductions" ADD CONSTRAINT "IpdClaimDeductions_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "IpdCharges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "IpdInsuranceDocuments" ADD CONSTRAINT "IpdInsuranceDocuments_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IpdInsuranceDocuments" ADD CONSTRAINT "IpdInsuranceDocuments_preauth_id_fkey" FOREIGN KEY ("preauth_id") REFERENCES "PreAuthorizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IpdInsuranceDocuments" ADD CONSTRAINT "IpdInsuranceDocuments_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "IpdClaims"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IpdInsuranceDocuments" ADD CONSTRAINT "IpdInsuranceDocuments_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
