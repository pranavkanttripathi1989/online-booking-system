-- REQ179 (IPD slice 2) -- nursing charting: medication orders/MAR,
-- intake/output, admission notes (+ addenda), shift handover, discharge
-- summary (+ templates). Hand-written per this repo's standing convention.

-- ============================================================
-- IpdMedicationOrders
-- ============================================================
CREATE TABLE "IpdMedicationOrders" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "admission_id" TEXT NOT NULL,
  "drug_id" TEXT NOT NULL,
  "dose" TEXT NOT NULL,
  "dose_unit" TEXT,
  "route" TEXT NOT NULL,
  "frequency" TEXT NOT NULL,
  "schedule_times_json" JSONB,
  "is_prn" BOOLEAN NOT NULL DEFAULT false,
  "prn_indication" TEXT,
  "start_at" TIMESTAMP(3) NOT NULL,
  "stop_at" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'active',
  "hold_reason" TEXT,
  "is_high_alert" BOOLEAN NOT NULL DEFAULT false,
  "instructions" TEXT,
  "ordered_by_clinician_id" TEXT NOT NULL,
  "stopped_by_user_id" TEXT,
  "stopped_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IpdMedicationOrders_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "IpdMedicationOrders_admission_id_status_idx" ON "IpdMedicationOrders"("admission_id", "status");
CREATE INDEX "IpdMedicationOrders_client_org_id_status_start_at_idx" ON "IpdMedicationOrders"("client_org_id", "status", "start_at");
CREATE INDEX "IpdMedicationOrders_drug_id_idx" ON "IpdMedicationOrders"("drug_id");

-- ============================================================
-- MedicationAdministrations (the MAR)
-- ============================================================
CREATE TABLE "MedicationAdministrations" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "admission_id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "drug_id" TEXT NOT NULL,
  "scheduled_at" TIMESTAMP(3) NOT NULL,
  "administered_at" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "dose_given" TEXT,
  "route" TEXT,
  "site" TEXT,
  "hold_reason" TEXT,
  "administered_by_user_id" TEXT,
  "witness_user_id" TEXT,
  "batch_id" TEXT,
  "stock_movement_id" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationAdministrations_pkey" PRIMARY KEY ("id")
);
-- Load-bearing: makes the MAR-generation sweep freely re-runnable via
-- createMany({skipDuplicates:true}) with zero duplicate doses.
CREATE UNIQUE INDEX "MedicationAdministrations_order_id_scheduled_at_key" ON "MedicationAdministrations"("order_id", "scheduled_at");
CREATE INDEX "MedicationAdministrations_admission_id_scheduled_at_idx" ON "MedicationAdministrations"("admission_id", "scheduled_at");
CREATE INDEX "MedicationAdministrations_client_org_id_status_scheduled_at_idx" ON "MedicationAdministrations"("client_org_id", "status", "scheduled_at");

-- ============================================================
-- IntakeOutputRecords
-- ============================================================
CREATE TABLE "IntakeOutputRecords" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "admission_id" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "volume_ml" INTEGER NOT NULL,
  "recorded_at" TIMESTAMP(3) NOT NULL,
  "shift" TEXT NOT NULL,
  "notes" TEXT,
  "recorded_by_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntakeOutputRecords_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "IntakeOutputRecords_admission_id_recorded_at_idx" ON "IntakeOutputRecords"("admission_id", "recorded_at");

-- ============================================================
-- AdmissionNotes (+ lock trigger) / AdmissionNoteAddenda (append-only)
-- ============================================================
CREATE TABLE "AdmissionNotes" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "admission_id" TEXT NOT NULL,
  "note_kind" TEXT NOT NULL,
  "content" TEXT NOT NULL DEFAULT '',
  "subjective" TEXT,
  "objective" TEXT,
  "assessment" TEXT,
  "plan" TEXT,
  "shift" TEXT,
  "note_datetime" TIMESTAMP(3) NOT NULL,
  "author_user_id" TEXT NOT NULL,
  "author_clinician_id" TEXT,
  "signed_at" TIMESTAMP(3),
  "locked" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdmissionNotes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdmissionNotes_admission_id_note_datetime_idx" ON "AdmissionNotes"("admission_id", "note_datetime");
CREATE INDEX "AdmissionNotes_admission_id_note_kind_note_datetime_idx" ON "AdmissionNotes"("admission_id", "note_kind", "note_datetime");
CREATE INDEX "AdmissionNotes_client_org_id_author_user_id_idx" ON "AdmissionNotes"("client_org_id", "author_user_id");

CREATE TABLE "AdmissionNoteAddenda" (
  "id" TEXT NOT NULL,
  "admission_note_id" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdmissionNoteAddenda_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdmissionNoteAddenda_admission_note_id_created_at_idx" ON "AdmissionNoteAddenda"("admission_note_id", "created_at");

-- Sign-off immutability, same "write-protected by trigger" contract as
-- reject_write_if_encounter_locked() (20260824010000_clinical_records_
-- encounters) -- but simpler, since `locked` lives on THIS row, not a
-- parent's, so no cross-table lookup is needed. Signing itself is the one
-- UPDATE this permits: false -> true always succeeds; any further write
-- once already true is rejected. Reused for DischargeSummaries below.
CREATE FUNCTION reject_write_if_locked() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."locked" THEN
      RAISE EXCEPTION 'Cannot delete a signed (locked) % %', TG_TABLE_NAME, OLD.id;
    END IF;
    RETURN OLD;
  END IF;
  IF OLD."locked" THEN
    RAISE EXCEPTION 'Cannot modify a signed (locked) % %; add an addendum instead', TG_TABLE_NAME, OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admission_notes_lock_guard
  BEFORE UPDATE OR DELETE ON "AdmissionNotes"
  FOR EACH ROW EXECUTE FUNCTION reject_write_if_locked();

-- ============================================================
-- ShiftHandovers
-- ============================================================
CREATE TABLE "ShiftHandovers" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "admission_id" TEXT NOT NULL,
  "ward_id" TEXT NOT NULL,
  "from_shift" TEXT NOT NULL,
  "to_shift" TEXT NOT NULL,
  "handover_at" TIMESTAMP(3) NOT NULL,
  "situation" TEXT NOT NULL DEFAULT '',
  "background" TEXT NOT NULL DEFAULT '',
  "assessment" TEXT NOT NULL DEFAULT '',
  "recommendation" TEXT NOT NULL DEFAULT '',
  "pending_tasks" TEXT,
  "from_user_id" TEXT NOT NULL,
  "to_user_id" TEXT,
  "acknowledged_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShiftHandovers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ShiftHandovers_admission_id_handover_at_idx" ON "ShiftHandovers"("admission_id", "handover_at");
CREATE INDEX "ShiftHandovers_ward_id_handover_at_idx" ON "ShiftHandovers"("ward_id", "handover_at");

-- ============================================================
-- DischargeSummaryTemplates / DischargeSummaries (+ lock trigger)
-- ============================================================
CREATE TABLE "DischargeSummaryTemplates" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "clinic_id" TEXT,
  "name" TEXT NOT NULL,
  "specialty" TEXT,
  "department_id" TEXT,
  "sections_json" JSONB NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DischargeSummaryTemplates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DischargeSummaryTemplates_client_org_id_clinic_id_is_active_idx" ON "DischargeSummaryTemplates"("client_org_id", "clinic_id", "is_active");

CREATE TABLE "DischargeSummaries" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "admission_id" TEXT NOT NULL,
  "template_id" TEXT,
  "chief_complaint" TEXT NOT NULL DEFAULT '',
  "history" TEXT NOT NULL DEFAULT '',
  "examination_findings" TEXT NOT NULL DEFAULT '',
  "final_diagnosis" TEXT NOT NULL DEFAULT '',
  "course_in_hospital" TEXT NOT NULL DEFAULT '',
  "procedures_performed" TEXT NOT NULL DEFAULT '',
  "investigations_summary" TEXT NOT NULL DEFAULT '',
  "condition_at_discharge" TEXT NOT NULL DEFAULT '',
  "discharge_prescription_id" TEXT,
  "discharge_medications" TEXT NOT NULL DEFAULT '',
  "diet_advice" TEXT NOT NULL DEFAULT '',
  "follow_up_advice" TEXT NOT NULL DEFAULT '',
  "follow_up_date" TIMESTAMP(3),
  "emergency_instructions" TEXT NOT NULL DEFAULT '',
  "icd10_codes" JSONB,
  "prepared_by_user_id" TEXT NOT NULL,
  "signed_by_clinician_id" TEXT,
  "signed_at" TIMESTAMP(3),
  "locked" BOOLEAN NOT NULL DEFAULT false,
  "pdf_hash" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DischargeSummaries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DischargeSummaries_admission_id_key" ON "DischargeSummaries"("admission_id");
CREATE INDEX "DischargeSummaries_client_org_id_signed_at_idx" ON "DischargeSummaries"("client_org_id", "signed_at");

CREATE TRIGGER discharge_summaries_lock_guard
  BEFORE UPDATE OR DELETE ON "DischargeSummaries"
  FOR EACH ROW EXECUTE FUNCTION reject_write_if_locked();

-- ============================================================
-- Foreign keys
-- ============================================================
ALTER TABLE "IpdMedicationOrders" ADD CONSTRAINT "IpdMedicationOrders_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IpdMedicationOrders" ADD CONSTRAINT "IpdMedicationOrders_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "Admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IpdMedicationOrders" ADD CONSTRAINT "IpdMedicationOrders_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "Drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IpdMedicationOrders" ADD CONSTRAINT "IpdMedicationOrders_ordered_by_clinician_id_fkey" FOREIGN KEY ("ordered_by_clinician_id") REFERENCES "Clinicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MedicationAdministrations" ADD CONSTRAINT "MedicationAdministrations_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationAdministrations" ADD CONSTRAINT "MedicationAdministrations_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "Admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicationAdministrations" ADD CONSTRAINT "MedicationAdministrations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "IpdMedicationOrders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicationAdministrations" ADD CONSTRAINT "MedicationAdministrations_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "Drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationAdministrations" ADD CONSTRAINT "MedicationAdministrations_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "DrugBatches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MedicationAdministrations" ADD CONSTRAINT "MedicationAdministrations_administered_by_user_id_fkey" FOREIGN KEY ("administered_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MedicationAdministrations" ADD CONSTRAINT "MedicationAdministrations_witness_user_id_fkey" FOREIGN KEY ("witness_user_id") REFERENCES "UserProfiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "IntakeOutputRecords" ADD CONSTRAINT "IntakeOutputRecords_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntakeOutputRecords" ADD CONSTRAINT "IntakeOutputRecords_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "Admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntakeOutputRecords" ADD CONSTRAINT "IntakeOutputRecords_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AdmissionNotes" ADD CONSTRAINT "AdmissionNotes_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdmissionNotes" ADD CONSTRAINT "AdmissionNotes_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "Admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdmissionNotes" ADD CONSTRAINT "AdmissionNotes_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdmissionNotes" ADD CONSTRAINT "AdmissionNotes_author_clinician_id_fkey" FOREIGN KEY ("author_clinician_id") REFERENCES "Clinicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdmissionNoteAddenda" ADD CONSTRAINT "AdmissionNoteAddenda_admission_note_id_fkey" FOREIGN KEY ("admission_note_id") REFERENCES "AdmissionNotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdmissionNoteAddenda" ADD CONSTRAINT "AdmissionNoteAddenda_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ShiftHandovers" ADD CONSTRAINT "ShiftHandovers_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShiftHandovers" ADD CONSTRAINT "ShiftHandovers_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "Admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShiftHandovers" ADD CONSTRAINT "ShiftHandovers_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "Wards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShiftHandovers" ADD CONSTRAINT "ShiftHandovers_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShiftHandovers" ADD CONSTRAINT "ShiftHandovers_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "UserProfiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DischargeSummaryTemplates" ADD CONSTRAINT "DischargeSummaryTemplates_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DischargeSummaryTemplates" ADD CONSTRAINT "DischargeSummaryTemplates_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DischargeSummaryTemplates" ADD CONSTRAINT "DischargeSummaryTemplates_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DischargeSummaries" ADD CONSTRAINT "DischargeSummaries_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DischargeSummaries" ADD CONSTRAINT "DischargeSummaries_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "Admissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DischargeSummaries" ADD CONSTRAINT "DischargeSummaries_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "DischargeSummaryTemplates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DischargeSummaries" ADD CONSTRAINT "DischargeSummaries_discharge_prescription_id_fkey" FOREIGN KEY ("discharge_prescription_id") REFERENCES "Prescriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DischargeSummaries" ADD CONSTRAINT "DischargeSummaries_prepared_by_user_id_fkey" FOREIGN KEY ("prepared_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DischargeSummaries" ADD CONSTRAINT "DischargeSummaries_signed_by_clinician_id_fkey" FOREIGN KEY ("signed_by_clinician_id") REFERENCES "Clinicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;
