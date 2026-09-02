import { ObjectType, Field, ID, Int, GraphQLISODateTime } from '@nestjs/graphql';

// REQ179 (IPD slice 1). client_org_id is not exposed — ownership column, not
// display data, matching every other tenant-scoped entity here.

@ObjectType('AdmissionPatient')
export class AdmissionPatientType {
  @Field(() => ID) id: string;
  @Field() full_name: string;
  @Field({ nullable: true }) phone?: string;
  @Field({ nullable: true }) gender?: string;
  @Field({ nullable: true }) date_of_birth?: Date;
}

@ObjectType('AdmissionClinician')
export class AdmissionClinicianType {
  @Field(() => ID) id: string;
  @Field() full_name: string;
  @Field({ nullable: true }) clinician_type?: string;
}

@ObjectType('AdmissionBedPlacement')
export class AdmissionBedPlacementType {
  @Field(() => ID) bed_id: string;
  @Field() bed_number: string;
  @Field(() => ID) ward_id: string;
  @Field() ward_name: string;
  @Field() ward_type: string;
  @Field() start_at: Date;
  @Field({ nullable: true }) end_at?: Date;
  @Field({ nullable: true }) end_reason?: string;
}

@ObjectType('Admission')
export class AdmissionType {
  @Field(() => ID) id: string;
  @Field() admission_number: string;
  @Field() status: string;
  @Field() admission_type: string;
  @Field() admitted_at: Date;
  @Field({ nullable: true }) expected_discharge_at?: Date;
  @Field({ nullable: true }) discharge_initiated_at?: Date;
  @Field({ nullable: true }) discharged_at?: Date;
  @Field({ nullable: true }) discharge_type?: string;

  @Field(() => AdmissionPatientType) patient: AdmissionPatientType;
  @Field(() => AdmissionClinicianType) admitting_clinician: AdmissionClinicianType;
  @Field(() => AdmissionClinicianType) attending_clinician: AdmissionClinicianType;
  @Field(() => ID) clinic_id: string;
  @Field({ nullable: true }) clinic_name?: string;
  @Field(() => ID, { nullable: true }) department_id?: string;
  @Field({ nullable: true }) department_name?: string;

  // Where the patient is right now. Null once discharged — the full history is
  // on `bed_history`.
  @Field(() => AdmissionBedPlacementType, { nullable: true }) current_bed?: AdmissionBedPlacementType;
  @Field(() => [AdmissionBedPlacementType]) bed_history: AdmissionBedPlacementType[];

  @Field() provisional_diagnosis: string;
  @Field({ nullable: true }) final_diagnosis?: string;
  @Field() admission_notes: string;

  @Field() billing_mode: string;
  @Field(() => ID, { nullable: true }) payer_id?: string;
  @Field({ nullable: true }) payer_name?: string;

  @Field() is_mlc: boolean;
  @Field() is_critical: boolean;

  // Whole days elapsed since admission, inclusive of the admission day —
  // derived at read time, never stored. Slice 4's billing applies the real
  // per-clinic day-boundary policy; this is the human-readable "day 3 of stay".
  @Field(() => Int) length_of_stay_days: number;

  @Field(() => ID, { nullable: true }) source_appointment_id?: string;
  @Field(() => ID, { nullable: true }) source_encounter_id?: string;
  @Field() created_at: Date;
}

// The stay timeline. `payload_json` is deliberately projected into named
// fields rather than exposed as a raw JSON scalar — this codebase has no JSON
// scalar registered and consistently surfaces structured types instead (the
// PlanVersions.feature_flags_json → [{key, enabled}] precedent). A payload key
// nothing here names simply isn't shown; add a field when the UI needs it.
@ObjectType('AdmissionEvent')
export class AdmissionEventType {
  @Field(() => ID) id: string;
  @Field() event_type: string;
  @Field() occurred_at: Date;
  @Field({ nullable: true }) notes?: string;
  @Field(() => ID) actor_user_id: string;
  @Field({ nullable: true }) actor_name?: string;

  // Transfer detail, populated only on a `transferred` event.
  @Field({ nullable: true }) from_bed_number?: string;
  @Field({ nullable: true }) to_bed_number?: string;
  @Field({ nullable: true }) from_ward_name?: string;
  @Field({ nullable: true }) to_ward_name?: string;
  @Field({ nullable: true }) reason?: string;
}

@ObjectType('MlcAmendment')
export class MlcAmendmentType {
  @Field(() => ID) id: string;
  @Field() field_name: string;
  @Field() previous_value: string;
  @Field() corrected_value: string;
  @Field() reason: string;
  @Field() amended_at: Date;
  @Field({ nullable: true }) amended_by_name?: string;
}

@ObjectType('MlcRegister')
export class MlcRegisterType {
  @Field(() => ID) id: string;
  @Field() mlc_number: string;
  @Field() mlc_category: string;
  @Field(() => ID) admission_id: string;
  @Field({ nullable: true }) admission_number?: string;
  @Field({ nullable: true }) patient_name?: string;

  @Field({ nullable: true }) incident_datetime?: Date;
  @Field({ nullable: true }) incident_place?: string;
  @Field({ nullable: true }) brought_by_name?: string;
  @Field({ nullable: true }) brought_by_relation?: string;
  @Field({ nullable: true }) brought_by_contact?: string;
  @Field({ nullable: true }) brought_by_id_proof?: string;

  @Field() identification_mark_1: string;
  @Field() identification_mark_2: string;
  @Field() injury_details: string;

  @Field({ nullable: true }) police_station?: string;
  @Field({ nullable: true }) police_intimated_at?: Date;
  @Field({ nullable: true }) receiving_officer_name?: string;
  @Field({ nullable: true }) receiving_officer_buckle_no?: string;
  @Field({ nullable: true }) intimation_mode?: string;
  // True once past the statutory 24h window with no intimation recorded —
  // derived, so the register list can surface its own overdue rows.
  @Field() police_intimation_overdue: boolean;

  @Field({ nullable: true }) examined_by_name?: string;
  @Field({ nullable: true }) recorded_by_name?: string;
  @Field(() => GraphQLISODateTime) recorded_at: Date;
  @Field(() => [MlcAmendmentType]) amendments: MlcAmendmentType[];
}

@ObjectType('DischargeSummaryTemplateSection')
export class DischargeSummaryTemplateSectionType {
  @Field() key: string;
  @Field() label: string;
  @Field({ nullable: true }) default_text?: string;
}

@ObjectType('DischargeSummaryTemplate')
export class DischargeSummaryTemplateType {
  @Field(() => ID) id: string;
  @Field(() => ID, { nullable: true }) clinic_id?: string;
  @Field() name: string;
  @Field({ nullable: true }) specialty?: string;
  @Field(() => [DischargeSummaryTemplateSectionType]) sections: DischargeSummaryTemplateSectionType[];
  @Field() is_active: boolean;
}

@ObjectType('DischargeSummary')
export class DischargeSummaryType {
  @Field(() => ID) id: string;
  @Field(() => ID) admission_id: string;
  @Field(() => ID, { nullable: true }) template_id?: string;
  @Field() chief_complaint: string;
  @Field() history: string;
  @Field() examination_findings: string;
  @Field() final_diagnosis: string;
  @Field() course_in_hospital: string;
  @Field() procedures_performed: string;
  @Field() investigations_summary: string;
  @Field() condition_at_discharge: string;
  @Field(() => ID, { nullable: true }) discharge_prescription_id?: string;
  @Field() discharge_medications: string;
  @Field() diet_advice: string;
  @Field() follow_up_advice: string;
  @Field({ nullable: true }) follow_up_date?: Date;
  @Field() emergency_instructions: string;
  @Field(() => [String], { nullable: true }) icd10_codes?: string[];
  @Field({ nullable: true }) prepared_by_name?: string;
  @Field({ nullable: true }) signed_by_name?: string;
  @Field({ nullable: true }) signed_at?: Date;
  @Field() locked: boolean;
  @Field({ nullable: true }) pdf_hash?: string;
  @Field() created_at: Date;
}

@ObjectType('AdmissionUserError')
export class AdmissionUserErrorType {
  @Field() message: string;
}

@ObjectType('AdmissionMutationResult')
export class AdmissionMutationResultType {
  @Field() success: boolean;
  @Field(() => [AdmissionUserErrorType]) userErrors: AdmissionUserErrorType[];
}
