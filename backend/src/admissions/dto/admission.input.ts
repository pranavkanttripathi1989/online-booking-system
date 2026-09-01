import { InputType, Field, ID, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsIn, IsBoolean, IsInt, Min, IsDate } from 'class-validator';

// REQ179 (IPD slice 1). Every @Field carries at least one class-validator
// decorator — the global ValidationPipe's whitelist+forbidNonWhitelisted pair
// silently strips an undecorated field and then rejects the request for
// sending it.

export const ADMISSION_STATUSES = [
  'pending',
  'admitted',
  'discharge_initiated',
  'discharged',
  'cancelled',
  'lama',
  'absconded',
  'expired',
] as const;

export const ADMISSION_TYPES = ['general', 'insurance', 'corporate', 'emergency', 'day_care', 'maternity'] as const;

export const DISCHARGE_TYPES = ['routine', 'dama', 'transfer_out', 'expired', 'absconded'] as const;

export const MLC_CATEGORIES = [
  'road_accident',
  'poisoning',
  'assault',
  'burns',
  'sexual_assault',
  'child_abuse',
  'unnatural_death',
  'industrial_accident',
  'attempted_suicide',
  'other',
] as const;

@InputType()
export class CreateAdmissionInput {
  @Field(() => ID) @IsNotEmpty() clinic_id: string;

  @Field(() => ID) @IsNotEmpty() patient_id: string;

  // The bed the patient physically goes into. Required: an admission with no
  // bed is a waiting-list entry, which this slice deliberately does not model.
  @Field(() => ID) @IsNotEmpty() bed_id: string;

  @Field(() => ID) @IsNotEmpty() admitting_clinician_id: string;

  // Defaults to the admitting clinician when omitted.
  @Field(() => ID, { nullable: true }) @IsOptional() attending_clinician_id?: string;

  @Field(() => ID, { nullable: true }) @IsOptional() department_id?: string;

  @Field({ nullable: true }) @IsOptional() @IsIn(ADMISSION_TYPES as unknown as string[]) admission_type?: string;

  // Defaults to now. Accepting it explicitly supports recording an admission
  // after the fact, which the exclusion constraint then validates against the
  // bed's real history rather than trusting the entered time.
  @Field({ nullable: true }) @IsOptional() @IsDate() admitted_at?: Date;

  @Field({ nullable: true }) @IsOptional() @IsDate() expected_discharge_at?: Date;

  @Field({ nullable: true }) @IsOptional() provisional_diagnosis?: string;

  @Field({ nullable: true }) @IsOptional() admission_notes?: string;

  // Provenance when this admission was planned from an OPD consult. Both
  // optional — an emergency admission has neither.
  @Field(() => ID, { nullable: true }) @IsOptional() source_appointment_id?: string;

  @Field(() => ID, { nullable: true }) @IsOptional() source_encounter_id?: string;

  @Field(() => ID, { nullable: true }) @IsOptional() payer_id?: string;

  @Field(() => ID, { nullable: true }) @IsOptional() policy_id?: string;

  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_critical?: boolean;
}

@InputType()
export class UpdateAdmissionInput {
  @Field(() => ID, { nullable: true }) @IsOptional() attending_clinician_id?: string;

  @Field(() => ID, { nullable: true }) @IsOptional() department_id?: string;

  @Field({ nullable: true }) @IsOptional() @IsDate() expected_discharge_at?: Date;

  @Field({ nullable: true }) @IsOptional() provisional_diagnosis?: string;

  @Field({ nullable: true }) @IsOptional() final_diagnosis?: string;

  @Field({ nullable: true }) @IsOptional() admission_notes?: string;

  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_critical?: boolean;
}

@InputType()
export class TransferAdmissionBedInput {
  @Field(() => ID) @IsNotEmpty() admission_id: string;

  @Field(() => ID) @IsNotEmpty() to_bed_id: string;

  // Defaults to now. A backdated transfer is validated against the target
  // bed's real occupancy history by the exclusion constraint — a guarantee
  // application code cannot provide at any price.
  @Field({ nullable: true }) @IsOptional() @IsDate() transferred_at?: Date;

  @Field({ nullable: true }) @IsOptional() reason?: string;
}

@InputType()
export class DischargeAdmissionInput {
  @Field(() => ID) @IsNotEmpty() admission_id: string;

  @Field({ nullable: true }) @IsOptional() @IsIn(DISCHARGE_TYPES as unknown as string[]) discharge_type?: string;

  @Field({ nullable: true }) @IsOptional() @IsDate() discharged_at?: Date;

  @Field({ nullable: true }) @IsOptional() final_diagnosis?: string;

  @Field({ nullable: true }) @IsOptional() notes?: string;
}

@InputType()
export class AdmissionFilterInput {
  @Field(() => ID, { nullable: true }) @IsOptional() clinic_id?: string;

  @Field(() => ID, { nullable: true }) @IsOptional() patient_id?: string;

  @Field(() => ID, { nullable: true }) @IsOptional() attending_clinician_id?: string;

  @Field(() => ID, { nullable: true }) @IsOptional() ward_id?: string;

  @Field({ nullable: true }) @IsOptional() @IsIn(ADMISSION_STATUSES as unknown as string[]) status?: string;

  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_mlc?: boolean;

  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(1) limit?: number;

  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(0) offset?: number;
}

// ── MLC ────────────────────────────────────────────────────────────────
//
// Statutory. Two identification marks are the legal minimum, so both are
// required rather than optional.
@InputType()
export class RecordMlcRegisterInput {
  @Field(() => ID) @IsNotEmpty() admission_id: string;

  @Field() @IsIn(MLC_CATEGORIES as unknown as string[]) mlc_category: string;

  @Field() @IsNotEmpty() identification_mark_1: string;

  @Field() @IsNotEmpty() identification_mark_2: string;

  @Field(() => ID) @IsNotEmpty() examined_by_clinician_id: string;

  @Field({ nullable: true }) @IsOptional() @IsDate() incident_datetime?: Date;

  @Field({ nullable: true }) @IsOptional() incident_place?: string;

  @Field({ nullable: true }) @IsOptional() brought_by_name?: string;

  @Field({ nullable: true }) @IsOptional() brought_by_relation?: string;

  @Field({ nullable: true }) @IsOptional() brought_by_contact?: string;

  @Field({ nullable: true }) @IsOptional() brought_by_id_proof?: string;

  @Field({ nullable: true }) @IsOptional() injury_details?: string;

  @Field({ nullable: true }) @IsOptional() police_station?: string;
}

// Filed separately from the register itself because it legitimately happens
// later (the 24h obligation) — the one carve-out the immutability trigger
// allows, and only once.
@InputType()
export class RecordPoliceIntimationInput {
  @Field(() => ID) @IsNotEmpty() mlc_register_id: string;

  @Field() @IsNotEmpty() police_station: string;

  @Field() @IsNotEmpty() receiving_officer_name: string;

  @Field({ nullable: true }) @IsOptional() receiving_officer_buckle_no?: string;

  @Field({ nullable: true }) @IsOptional() @IsIn(['in_person', 'phone', 'written', 'email'] as string[]) intimation_mode?: string;

  @Field({ nullable: true }) @IsOptional() @IsDate() intimated_at?: Date;
}

// A correction to a filed MLC register is an appended, attributed amendment —
// never an in-place edit. The DB trigger enforces this; this input is the
// sanctioned path.
@InputType()
export class AmendMlcRegisterInput {
  @Field(() => ID) @IsNotEmpty() mlc_register_id: string;

  @Field() @IsNotEmpty() field_name: string;

  @Field() @IsNotEmpty() corrected_value: string;

  @Field() @IsNotEmpty() reason: string;
}
