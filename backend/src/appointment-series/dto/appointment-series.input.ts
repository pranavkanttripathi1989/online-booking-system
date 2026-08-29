import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsIn, IsISO8601, IsString, Length, ValidateNested, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

// REQ163 (P2-10) — one occurrence within a series. Always heterogeneous-
// capable (its own service_id/clinician_id/notes) — a "recurring" series
// is just this same shape repeated with the same service_id by the
// frontend's own generator, never a separate backend input type.
@InputType('AppointmentSeriesOccurrenceInput')
export class AppointmentSeriesOccurrenceInput {
  @Field() @IsISO8601() start_datetime: string;
  @Field() @IsNotEmpty() service_id: string;
  // Optional — defaults to the series' own clinician when omitted, but a
  // treatment plan may legitimately see a different clinician per step
  // (e.g. a specialist referral occurrence).
  @Field({ nullable: true }) @IsOptional() clinician_id?: string;
  @Field({ nullable: true }) @IsOptional() notes?: string;
}

// Deliberately does NOT accept hold_token — a slot hold is a single-slot
// checkout concept (BOOK-2) and doesn't apply across N occurrences.
@InputType('CreateAppointmentSeriesInput')
export class CreateAppointmentSeriesInput {
  @Field() @IsNotEmpty() name: string;
  @Field() @IsNotEmpty() patient_id: string;
  @Field() @IsNotEmpty() clinic_id: string;
  // The clinician most occurrences use; a per-occurrence clinician_id
  // overrides this one when supplied.
  @Field() @IsNotEmpty() clinician_id: string;
  @Field() @IsIn(['recurring', 'treatment_plan']) series_type: string;
  // Capped at 52 (a year of weekly occurrences) — a sanity bound, not a
  // product decision; raise it if a real use case needs more.
  @Field(() => [AppointmentSeriesOccurrenceInput])
  @ValidateNested({ each: true })
  @Type(() => AppointmentSeriesOccurrenceInput)
  @ArrayMinSize(2)
  @ArrayMaxSize(52)
  occurrences: AppointmentSeriesOccurrenceInput[];
  // P1-05 (BOOK-3) analog — protects the "Create Series" button from a
  // double click. AppointmentSeriesService derives one distinct,
  // deterministic per-occurrence key from this for each inner
  // AppointmentsService.create() call, so a full retry of this call is
  // itself safely idempotent occurrence-by-occurrence too.
  @Field({ nullable: true }) @IsOptional() @IsString() @Length(8, 128) idempotency_key?: string;
}

@InputType('CancelAppointmentSeriesInput')
export class CancelAppointmentSeriesInput {
  @Field() @IsNotEmpty() series_id: string;
  @Field() @IsNotEmpty() reason: string;
}
