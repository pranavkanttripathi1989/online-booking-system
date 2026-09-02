import { InputType, Field, ID, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsIn, IsBoolean, IsInt, Min, IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { VITAL_CODES } from '../../encounters/dto/encounter.input';

// REQ179 (IPD slice 2). Every @Field carries at least one class-validator
// decorator — the global ValidationPipe's whitelist+forbidNonWhitelisted
// pair silently strips an undecorated field and then rejects the request
// for sending it (the documented, previously-shipped bug class).

export const SHIFTS = ['morning', 'evening', 'night'] as const;
export const ROUTES = ['po', 'iv', 'im', 'sc', 'sl', 'topical', 'inhaled', 'pr', 'ng'] as const;
export const FREQUENCIES = ['OD', 'BD', 'TDS', 'QID', 'Q4H', 'Q6H', 'HS', 'STAT', 'SOS'] as const;
export const MAR_STATUSES = ['scheduled', 'given', 'held', 'refused', 'missed', 'not_available', 'self_administered'] as const;
export const NOTE_KINDS = [
  'nursing_progress', 'doctor_round', 'nursing_assessment', 'incident', 'discharge_planning', 'physio', 'dietitian',
] as const;
export const IO_DIRECTIONS = ['intake', 'output'] as const;
export const IO_INTAKE_CATEGORIES = ['oral', 'iv', 'ryles_tube', 'blood_product', 'other_intake'] as const;
export const IO_OUTPUT_CATEGORIES = ['urine', 'drain', 'vomitus', 'stool', 'ngt_aspirate', 'blood_loss', 'other_output'] as const;

// ── Vitals (admission-scoped — mirrors encounters/dto's VitalReadingInput) ──

@InputType()
export class AdmissionVitalReadingInput {
  @Field() @IsIn(VITAL_CODES as unknown as string[]) code: string;
  @Field() value: number;
}

@InputType()
export class RecordAdmissionVitalsInput {
  @Field(() => ID) @IsNotEmpty() admission_id: string;
  @Field({ nullable: true }) @IsOptional() @IsIn(SHIFTS as unknown as string[]) shift?: string;
  @Field(() => [AdmissionVitalReadingInput])
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AdmissionVitalReadingInput)
  readings: AdmissionVitalReadingInput[];
}

// ── Medication orders ────────────────────────────────────────────────────

@InputType()
export class CreateIpdMedicationOrderInput {
  @Field(() => ID) @IsNotEmpty() admission_id: string;
  @Field(() => ID) @IsNotEmpty() drug_id: string;
  @Field() @IsNotEmpty() dose: string;
  @Field({ nullable: true }) @IsOptional() dose_unit?: string;
  @Field() @IsIn(ROUTES as unknown as string[]) route: string;
  @Field() @IsIn(FREQUENCIES as unknown as string[]) frequency: string;
  // ["08:00","14:00","20:00"] — validated as non-empty strings, not parsed
  // as times server-side; a malformed entry just never matches the sweep's
  // own materialisation window, which is a silent no-op, not a crash.
  @Field(() => [String], { nullable: true }) @IsOptional() @IsArray() schedule_times?: string[];
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_prn?: boolean;
  @Field({ nullable: true }) @IsOptional() prn_indication?: string;
  @Field({ nullable: true }) @IsOptional() start_at?: Date;
  @Field({ nullable: true }) @IsOptional() stop_at?: Date;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_high_alert?: boolean;
  @Field({ nullable: true }) @IsOptional() instructions?: string;
}

@InputType()
export class HoldIpdMedicationOrderInput {
  @Field(() => ID) @IsNotEmpty() order_id: string;
  @Field() @IsNotEmpty() reason: string;
}

@InputType()
export class StopIpdMedicationOrderInput {
  @Field(() => ID) @IsNotEmpty() order_id: string;
  @Field({ nullable: true }) @IsOptional() reason?: string;
}

// ── MAR ───────────────────────────────────────────────────────────────────

@InputType()
export class AdministerMedicationInput {
  @Field(() => ID) @IsNotEmpty() mar_id: string;
  @Field() @IsIn(MAR_STATUSES as unknown as string[]) status: string;
  @Field({ nullable: true }) @IsOptional() dose_given?: string;
  @Field({ nullable: true }) @IsOptional() route?: string;
  @Field({ nullable: true }) @IsOptional() site?: string;
  @Field({ nullable: true }) @IsOptional() hold_reason?: string;
  // Required by the service when order.is_high_alert — validated there,
  // not here, since the requirement is conditional on a sibling row.
  @Field(() => ID, { nullable: true }) @IsOptional() witness_user_id?: string;
  // Real stock consumption — both required together when status='given' and
  // the order isn't PRN-without-stock-tracking; validated in the service.
  @Field(() => ID, { nullable: true }) @IsOptional() batch_id?: string;
  @Field({ nullable: true }) @IsOptional() notes?: string;
}

// A PRN (as-needed) dose has no pre-materialised MAR row to update — it is
// recorded directly, scheduled_at = administered_at.
@InputType()
export class RecordPrnAdministrationInput {
  @Field(() => ID) @IsNotEmpty() order_id: string;
  @Field() @IsIn(MAR_STATUSES as unknown as string[]) status: string;
  @Field({ nullable: true }) @IsOptional() dose_given?: string;
  @Field({ nullable: true }) @IsOptional() route?: string;
  @Field({ nullable: true }) @IsOptional() site?: string;
  @Field(() => ID, { nullable: true }) @IsOptional() witness_user_id?: string;
  @Field(() => ID, { nullable: true }) @IsOptional() batch_id?: string;
  @Field({ nullable: true }) @IsOptional() notes?: string;
}

// ── Intake / output ───────────────────────────────────────────────────────

@InputType()
export class RecordIntakeOutputInput {
  @Field(() => ID) @IsNotEmpty() admission_id: string;
  @Field() @IsIn(IO_DIRECTIONS as unknown as string[]) direction: string;
  @Field() @IsNotEmpty() category: string; // validated against the direction-specific list in the service
  @Field(() => Int) @IsInt() @Min(0) volume_ml: number;
  @Field({ nullable: true }) @IsOptional() recorded_at?: Date;
  @Field() @IsIn(SHIFTS as unknown as string[]) shift: string;
  @Field({ nullable: true }) @IsOptional() notes?: string;
}

// ── Admission notes ───────────────────────────────────────────────────────

@InputType()
export class CreateAdmissionNoteInput {
  @Field(() => ID) @IsNotEmpty() admission_id: string;
  @Field() @IsIn(NOTE_KINDS as unknown as string[]) note_kind: string;
  @Field({ nullable: true }) @IsOptional() content?: string;
  @Field({ nullable: true }) @IsOptional() subjective?: string;
  @Field({ nullable: true }) @IsOptional() objective?: string;
  @Field({ nullable: true }) @IsOptional() assessment?: string;
  @Field({ nullable: true }) @IsOptional() plan?: string;
  @Field({ nullable: true }) @IsOptional() @IsIn(SHIFTS as unknown as string[]) shift?: string;
  @Field({ nullable: true }) @IsOptional() note_datetime?: Date;
}

@InputType()
export class SignAdmissionNoteInput {
  @Field(() => ID) @IsNotEmpty() note_id: string;
}

@InputType()
export class AddAdmissionNoteAddendumInput {
  @Field(() => ID) @IsNotEmpty() note_id: string;
  @Field() @IsNotEmpty() content: string;
  @Field({ nullable: true }) @IsOptional() reason?: string;
}

// ── Shift handover ────────────────────────────────────────────────────────

@InputType()
export class CreateShiftHandoverInput {
  @Field(() => ID) @IsNotEmpty() admission_id: string;
  @Field(() => ID) @IsNotEmpty() ward_id: string;
  @Field() @IsIn(SHIFTS as unknown as string[]) from_shift: string;
  @Field() @IsIn(SHIFTS as unknown as string[]) to_shift: string;
  @Field({ nullable: true }) @IsOptional() handover_at?: Date;
  @Field({ nullable: true }) @IsOptional() situation?: string;
  @Field({ nullable: true }) @IsOptional() background?: string;
  @Field({ nullable: true }) @IsOptional() assessment?: string;
  @Field({ nullable: true }) @IsOptional() recommendation?: string;
  @Field({ nullable: true }) @IsOptional() pending_tasks?: string;
  @Field(() => ID, { nullable: true }) @IsOptional() to_user_id?: string;
}

@InputType()
export class AcknowledgeShiftHandoverInput {
  @Field(() => ID) @IsNotEmpty() handover_id: string;
}
