-- REQ179 (IPD slice 1) — in-patient ADT core.
--
-- Hand-written per this repo's standing convention (`prisma migrate dev`
-- cannot run non-interactively here). Read end-to-end against the
-- schema.prisma diff before applying.

-- ============================================================
-- Wards
-- ============================================================
CREATE TABLE "Wards" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "ward_type" TEXT NOT NULL DEFAULT 'general',
  "floor" TEXT,
  "gender_policy" TEXT NOT NULL DEFAULT 'mixed',
  "bed_charge_product_id" TEXT,
  "nursing_charge_product_id" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Wards_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Wards_client_org_id_clinic_id_is_deleted_idx" ON "Wards"("client_org_id", "clinic_id", "is_deleted");
CREATE INDEX "Wards_clinic_id_ward_type_is_active_idx" ON "Wards"("clinic_id", "ward_type", "is_active");

-- ============================================================
-- Beds
-- ============================================================
CREATE TABLE "Beds" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "ward_id" TEXT NOT NULL,
  "bed_number" TEXT NOT NULL,
  "bed_type" TEXT,
  "bed_charge_product_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'available',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Beds_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Beds_ward_id_bed_number_key" ON "Beds"("ward_id", "bed_number");
-- The bed board is the hottest IPD query; client_org_id leads here only
-- because the board is always org+clinic scoped and status is the selective
-- filter that follows (BUG005's "lead with the selective column" caveat is
-- about composites where client_org_id is the ONLY leading predicate).
CREATE INDEX "Beds_client_org_id_clinic_id_status_idx" ON "Beds"("client_org_id", "clinic_id", "status");
CREATE INDEX "Beds_ward_id_status_is_deleted_idx" ON "Beds"("ward_id", "status", "is_deleted");

-- ============================================================
-- Admissions
-- ============================================================
CREATE TABLE "Admissions" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "patient_id" TEXT NOT NULL,
  "admission_number" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "admission_type" TEXT NOT NULL DEFAULT 'general',
  "admitted_at" TIMESTAMP(3) NOT NULL,
  "expected_discharge_at" TIMESTAMP(3),
  "discharge_initiated_at" TIMESTAMP(3),
  "discharged_at" TIMESTAMP(3),
  "discharge_type" TEXT,
  "admitting_clinician_id" TEXT NOT NULL,
  "attending_clinician_id" TEXT NOT NULL,
  "department_id" TEXT,
  "source_appointment_id" TEXT,
  "source_encounter_id" TEXT,
  "provisional_diagnosis" TEXT NOT NULL DEFAULT '',
  "final_diagnosis" TEXT,
  "admission_notes" TEXT NOT NULL DEFAULT '',
  "billing_mode" TEXT NOT NULL DEFAULT 'itemized',
  "ipd_package_id" TEXT,
  "payer_id" TEXT,
  "policy_id" TEXT,
  "is_mlc" BOOLEAN NOT NULL DEFAULT false,
  "is_critical" BOOLEAN NOT NULL DEFAULT false,
  "created_by_user_id" TEXT NOT NULL,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Admissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Admissions_admission_number_key" ON "Admissions"("admission_number");
CREATE INDEX "Admissions_client_org_id_clinic_id_status_idx" ON "Admissions"("client_org_id", "clinic_id", "status");
CREATE INDEX "Admissions_patient_id_admitted_at_idx" ON "Admissions"("patient_id", "admitted_at");
CREATE INDEX "Admissions_attending_clinician_id_status_idx" ON "Admissions"("attending_clinician_id", "status");
CREATE INDEX "Admissions_clinic_id_admitted_at_idx" ON "Admissions"("clinic_id", "admitted_at");

-- ============================================================
-- BedOccupancies — the bed timeline
-- ============================================================
CREATE TABLE "BedOccupancies" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "bed_id" TEXT NOT NULL,
  "ward_id" TEXT NOT NULL,
  "admission_id" TEXT,
  "occupancy_kind" TEXT NOT NULL DEFAULT 'occupied',
  "start_at" TIMESTAMP(3) NOT NULL,
  "end_at" TIMESTAMP(3),
  "end_reason" TEXT,
  "reason" TEXT,
  "is_cancelled" BOOLEAN NOT NULL DEFAULT false,
  "created_by_user_id" TEXT NOT NULL,
  "ended_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BedOccupancies_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BedOccupancies_bed_id_start_at_idx" ON "BedOccupancies"("bed_id", "start_at");
CREATE INDEX "BedOccupancies_admission_id_start_at_idx" ON "BedOccupancies"("admission_id", "start_at");
CREATE INDEX "BedOccupancies_client_org_id_clinic_id_end_at_idx" ON "BedOccupancies"("client_org_id", "clinic_id", "end_at");
CREATE INDEX "BedOccupancies_ward_id_start_at_idx" ON "BedOccupancies"("ward_id", "start_at");

-- A real patient occupancy must name its admission; a hold/cleaning/blocked
-- row must not. This is the guard that pays for admission_id being nullable
-- (which it must be, so that one EXCLUDE constraint can cover every kind of
-- bed reservation — see the model comment in schema.prisma).
ALTER TABLE "BedOccupancies" ADD CONSTRAINT "bed_occupancies_occupied_has_admission"
  CHECK ((occupancy_kind = 'occupied') = (admission_id IS NOT NULL));

-- An end_at, when present, must come after start_at. tsrange() would raise a
-- less legible error at insert time; this fails with a named constraint.
ALTER TABLE "BedOccupancies" ADD CONSTRAINT "bed_occupancies_end_after_start"
  CHECK (end_at IS NULL OR end_at > start_at);

-- THE double-occupancy guarantee. Copied from
-- 20260823030000_appointments_no_overlap_exclusion_constraint:
--   * btree_gist is required for the `bed_id WITH =` equality operator to
--     participate in a GiST index alongside the range overlap operator.
--     CREATE EXTENSION IF NOT EXISTS is idempotent and that migration has
--     already run it, so this is belt-and-braces.
--   * '[)' bounds: an occupancy ending exactly when the next begins is a clean
--     handover, not an overlap.
--   * end_at NULL yields an unbounded-upper range, which is exactly right for
--     "still in this bed" and overlaps every later attempt, as intended.
--   * The WHERE predicate lets a cancelled row genuinely free the bed while
--     keeping the history, mirroring how the appointments constraints exclude
--     cancelled/no_show.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "BedOccupancies" ADD CONSTRAINT "bed_occupancies_no_double_occupancy"
EXCLUDE USING gist (
  bed_id WITH =,
  tsrange(start_at, end_at, '[)') WITH &&
)
WHERE (is_cancelled = false);

-- ============================================================
-- AdmissionEvents
-- ============================================================
CREATE TABLE "AdmissionEvents" (
  "id" TEXT NOT NULL,
  "admission_id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payload_json" JSONB,
  "notes" TEXT,
  "actor_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdmissionEvents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdmissionEvents_admission_id_occurred_at_idx" ON "AdmissionEvents"("admission_id", "occurred_at");
CREATE INDEX "AdmissionEvents_client_org_id_event_type_occurred_at_idx" ON "AdmissionEvents"("client_org_id", "event_type", "occurred_at");

-- ============================================================
-- MlcRegisters / MlcAmendments — statutory, immutable
-- ============================================================
CREATE TABLE "MlcRegisters" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "admission_id" TEXT NOT NULL,
  "mlc_number" TEXT NOT NULL,
  "mlc_category" TEXT NOT NULL,
  "incident_datetime" TIMESTAMP(3),
  "incident_place" TEXT,
  "brought_by_name" TEXT,
  "brought_by_relation" TEXT,
  "brought_by_contact" TEXT,
  "brought_by_id_proof" TEXT,
  "identification_mark_1" TEXT NOT NULL,
  "identification_mark_2" TEXT NOT NULL,
  "injury_details" TEXT NOT NULL DEFAULT '',
  "police_station" TEXT,
  "police_intimated_at" TIMESTAMP(3),
  "police_intimated_by_user_id" TEXT,
  "receiving_officer_name" TEXT,
  "receiving_officer_buckle_no" TEXT,
  "intimation_mode" TEXT,
  "examined_by_clinician_id" TEXT NOT NULL,
  "recorded_by_user_id" TEXT NOT NULL,
  "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MlcRegisters_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MlcRegisters_admission_id_key" ON "MlcRegisters"("admission_id");
CREATE UNIQUE INDEX "MlcRegisters_mlc_number_key" ON "MlcRegisters"("mlc_number");
CREATE INDEX "MlcRegisters_client_org_id_clinic_id_recorded_at_idx" ON "MlcRegisters"("client_org_id", "clinic_id", "recorded_at");
CREATE INDEX "MlcRegisters_police_intimated_at_idx" ON "MlcRegisters"("police_intimated_at");
CREATE INDEX "MlcRegisters_mlc_category_idx" ON "MlcRegisters"("mlc_category");

CREATE TABLE "MlcAmendments" (
  "id" TEXT NOT NULL,
  "mlc_register_id" TEXT NOT NULL,
  "field_name" TEXT NOT NULL,
  "previous_value" TEXT NOT NULL,
  "corrected_value" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "amended_by_user_id" TEXT NOT NULL,
  "amended_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MlcAmendments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MlcAmendments_mlc_register_id_amended_at_idx" ON "MlcAmendments"("mlc_register_id", "amended_at");

-- Immutability, enforced by the database rather than the service layer —
-- modelled directly on reject_write_if_encounter_locked()
-- (20260824010000_clinical_records_encounters). The service layer's own
-- checks remain the fast, friendly-error path in front of this, never a
-- substitute for it.
--
-- The one carve-out: the police-intimation block is legitimately filled in
-- AFTER the record is created (the 24h obligation), so those columns may go
-- from NULL to a value exactly once. Everything clinically or legally
-- load-bearing is frozen; corrections are appended as MlcAmendments.
CREATE OR REPLACE FUNCTION reject_mlc_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'MLC register % cannot be deleted; it is a statutory lifelong record', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.police_intimated_at IS DISTINCT FROM OLD.police_intimated_at
     AND OLD.police_intimated_at IS NOT NULL THEN
    RAISE EXCEPTION 'MLC register %: police intimation is already recorded and cannot be changed', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.mlc_number             IS DISTINCT FROM OLD.mlc_number
     OR NEW.admission_id          IS DISTINCT FROM OLD.admission_id
     OR NEW.mlc_category          IS DISTINCT FROM OLD.mlc_category
     OR NEW.injury_details        IS DISTINCT FROM OLD.injury_details
     OR NEW.identification_mark_1 IS DISTINCT FROM OLD.identification_mark_1
     OR NEW.identification_mark_2 IS DISTINCT FROM OLD.identification_mark_2
     OR NEW.incident_datetime     IS DISTINCT FROM OLD.incident_datetime
     OR NEW.incident_place        IS DISTINCT FROM OLD.incident_place
     OR NEW.examined_by_clinician_id IS DISTINCT FROM OLD.examined_by_clinician_id
     OR NEW.recorded_by_user_id   IS DISTINCT FROM OLD.recorded_by_user_id
     OR NEW.recorded_at           IS DISTINCT FROM OLD.recorded_at
     OR NEW.brought_by_name       IS DISTINCT FROM OLD.brought_by_name
     OR NEW.brought_by_relation   IS DISTINCT FROM OLD.brought_by_relation
     OR NEW.brought_by_contact    IS DISTINCT FROM OLD.brought_by_contact
     OR NEW.brought_by_id_proof   IS DISTINCT FROM OLD.brought_by_id_proof THEN
    RAISE EXCEPTION 'MLC register % is immutable; record an MlcAmendment instead of editing it', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mlc_registers_immutable
  BEFORE UPDATE OR DELETE ON "MlcRegisters"
  FOR EACH ROW EXECUTE FUNCTION reject_mlc_mutation();

-- MlcAmendments is append-only: an amendment that could itself be edited
-- defeats the point of the register being tamper-evident.
CREATE OR REPLACE FUNCTION reject_mlc_amendment_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'MLC amendments are append-only (attempted % on %)', TG_OP, OLD.id
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mlc_amendments_append_only
  BEFORE UPDATE OR DELETE ON "MlcAmendments"
  FOR EACH ROW EXECUTE FUNCTION reject_mlc_amendment_mutation();

-- ============================================================
-- IpdBillingSettings — table only in this slice, wired in slice 4
-- ============================================================
CREATE TABLE "IpdBillingSettings" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "day_boundary_mode" TEXT NOT NULL DEFAULT 'calendar_day',
  "discharge_cutoff_hour" INTEGER NOT NULL DEFAULT 12,
  "charge_admission_day" BOOLEAN NOT NULL DEFAULT true,
  "charge_discharge_day" BOOLEAN NOT NULL DEFAULT false,
  "minimum_billable_days" INTEGER NOT NULL DEFAULT 1,
  "transfer_day_rate_policy" TEXT NOT NULL DEFAULT 'higher_of',
  "package_excess_policy" TEXT NOT NULL DEFAULT 'bill_extra',
  "default_deposit_paise" INTEGER NOT NULL DEFAULT 0,
  "auto_post_room_charges" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IpdBillingSettings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IpdBillingSettings_clinic_id_key" ON "IpdBillingSettings"("clinic_id");
CREATE INDEX "IpdBillingSettings_client_org_id_idx" ON "IpdBillingSettings"("client_org_id");

-- ============================================================
-- Foreign keys
-- ============================================================
ALTER TABLE "Wards" ADD CONSTRAINT "Wards_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Wards" ADD CONSTRAINT "Wards_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Wards" ADD CONSTRAINT "Wards_bed_charge_product_id_fkey" FOREIGN KEY ("bed_charge_product_id") REFERENCES "Products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Wards" ADD CONSTRAINT "Wards_nursing_charge_product_id_fkey" FOREIGN KEY ("nursing_charge_product_id") REFERENCES "Products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Beds" ADD CONSTRAINT "Beds_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Beds" ADD CONSTRAINT "Beds_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Beds" ADD CONSTRAINT "Beds_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "Wards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Beds" ADD CONSTRAINT "Beds_bed_charge_product_id_fkey" FOREIGN KEY ("bed_charge_product_id") REFERENCES "Products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Admissions" ADD CONSTRAINT "Admissions_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Admissions" ADD CONSTRAINT "Admissions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Admissions" ADD CONSTRAINT "Admissions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Admissions" ADD CONSTRAINT "Admissions_admitting_clinician_id_fkey" FOREIGN KEY ("admitting_clinician_id") REFERENCES "Clinicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Admissions" ADD CONSTRAINT "Admissions_attending_clinician_id_fkey" FOREIGN KEY ("attending_clinician_id") REFERENCES "Clinicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Admissions" ADD CONSTRAINT "Admissions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Admissions" ADD CONSTRAINT "Admissions_source_appointment_id_fkey" FOREIGN KEY ("source_appointment_id") REFERENCES "Appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Admissions" ADD CONSTRAINT "Admissions_source_encounter_id_fkey" FOREIGN KEY ("source_encounter_id") REFERENCES "Encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Admissions" ADD CONSTRAINT "Admissions_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "Payers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Admissions" ADD CONSTRAINT "Admissions_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "PatientInsurancePolicies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Admissions" ADD CONSTRAINT "Admissions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BedOccupancies" ADD CONSTRAINT "BedOccupancies_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BedOccupancies" ADD CONSTRAINT "BedOccupancies_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BedOccupancies" ADD CONSTRAINT "BedOccupancies_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "Beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BedOccupancies" ADD CONSTRAINT "BedOccupancies_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "Wards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BedOccupancies" ADD CONSTRAINT "BedOccupancies_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "Admissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BedOccupancies" ADD CONSTRAINT "BedOccupancies_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BedOccupancies" ADD CONSTRAINT "BedOccupancies_ended_by_user_id_fkey" FOREIGN KEY ("ended_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdmissionEvents" ADD CONSTRAINT "AdmissionEvents_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "Admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdmissionEvents" ADD CONSTRAINT "AdmissionEvents_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdmissionEvents" ADD CONSTRAINT "AdmissionEvents_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MlcRegisters" ADD CONSTRAINT "MlcRegisters_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MlcRegisters" ADD CONSTRAINT "MlcRegisters_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MlcRegisters" ADD CONSTRAINT "MlcRegisters_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "Admissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MlcRegisters" ADD CONSTRAINT "MlcRegisters_examined_by_clinician_id_fkey" FOREIGN KEY ("examined_by_clinician_id") REFERENCES "Clinicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MlcRegisters" ADD CONSTRAINT "MlcRegisters_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MlcRegisters" ADD CONSTRAINT "MlcRegisters_police_intimated_by_user_id_fkey" FOREIGN KEY ("police_intimated_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MlcAmendments" ADD CONSTRAINT "MlcAmendments_mlc_register_id_fkey" FOREIGN KEY ("mlc_register_id") REFERENCES "MlcRegisters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MlcAmendments" ADD CONSTRAINT "MlcAmendments_amended_by_user_id_fkey" FOREIGN KEY ("amended_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "IpdBillingSettings" ADD CONSTRAINT "IpdBillingSettings_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IpdBillingSettings" ADD CONSTRAINT "IpdBillingSettings_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
