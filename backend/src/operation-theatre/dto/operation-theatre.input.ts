import { InputType, Field, ID, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsIn, IsBoolean, IsInt, Min, IsDate, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// REQ179 (IPD slice 3). Every @Field carries at least one class-validator
// decorator — the global ValidationPipe's whitelist+forbidNonWhitelisted
// pair silently strips an undecorated field and then rejects the request
// for sending it.

export const OT_BOOKING_STAFF_ROLES = ['assistant_surgeon', 'scrub_nurse', 'circulating_nurse', 'anesthesia_tech', 'other'] as const;
export const OT_CHECKLIST_PHASES = ['sign_in', 'time_out', 'sign_out'] as const;

@InputType()
export class CreateOperationTheatreInput {
  @Field(() => ID) @IsNotEmpty() clinic_id: string;
  @Field() @IsNotEmpty() name: string;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(0) default_turnaround_minutes?: number;
}

@InputType()
export class UpdateOperationTheatreInput {
  @Field({ nullable: true }) @IsOptional() name?: string;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(0) default_turnaround_minutes?: number;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_active?: boolean;
}

@InputType()
export class CreateOtBookingInput {
  @Field(() => ID) @IsNotEmpty() admission_id: string;
  @Field(() => ID) @IsNotEmpty() theatre_id: string;
  @Field() @IsNotEmpty() procedure_name: string;
  @Field(() => ID) @IsNotEmpty() primary_surgeon_clinician_id: string;
  @Field(() => ID, { nullable: true }) @IsOptional() anesthetist_clinician_id?: string;
  @Field() @IsDate() start_at: Date;
  @Field() @IsDate() end_at: Date;
  // Overrides the theatre's own default when this specific case needs a
  // longer/shorter turnaround. Omitted = use the theatre's default.
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(0) turnaround_minutes?: number;
  @Field({ nullable: true }) @IsOptional() notes?: string;
}

@InputType()
export class CancelOtBookingInput {
  @Field(() => ID) @IsNotEmpty() booking_id: string;
  @Field() @IsNotEmpty() reason: string;
}

@InputType()
export class AssignOtBookingStaffInput {
  @Field(() => ID) @IsNotEmpty() booking_id: string;
  @Field(() => ID) @IsNotEmpty() user_id: string;
  @Field() @IsIn(OT_BOOKING_STAFF_ROLES as unknown as string[]) role: string;
}

@InputType()
export class OtChecklistItemInput {
  @Field() @IsNotEmpty() key: string;
  @Field() @IsNotEmpty() label: string;
  @Field() @IsBoolean() checked: boolean;
}

@InputType()
export class CompleteOtChecklistInput {
  @Field(() => ID) @IsNotEmpty() booking_id: string;
  @Field() @IsIn(OT_CHECKLIST_PHASES as unknown as string[]) phase: string;
  @Field(() => [OtChecklistItemInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OtChecklistItemInput)
  items: OtChecklistItemInput[];
}

@InputType()
export class CreateOtNoteInput {
  @Field(() => ID) @IsNotEmpty() booking_id: string;
  @Field({ nullable: true }) @IsOptional() pre_op_diagnosis?: string;
  @Field({ nullable: true }) @IsOptional() procedure_performed?: string;
  @Field({ nullable: true }) @IsOptional() findings?: string;
  @Field({ nullable: true }) @IsOptional() complications?: string;
  @Field({ nullable: true }) @IsOptional() post_op_diagnosis?: string;
  @Field({ nullable: true }) @IsOptional() post_op_instructions?: string;
}

@InputType()
export class UpdateOtNoteInput {
  @Field({ nullable: true }) @IsOptional() pre_op_diagnosis?: string;
  @Field({ nullable: true }) @IsOptional() procedure_performed?: string;
  @Field({ nullable: true }) @IsOptional() findings?: string;
  @Field({ nullable: true }) @IsOptional() complications?: string;
  @Field({ nullable: true }) @IsOptional() post_op_diagnosis?: string;
  @Field({ nullable: true }) @IsOptional() post_op_instructions?: string;
}

@InputType()
export class SignOtNoteInput {
  @Field(() => ID) @IsNotEmpty() booking_id: string;
}

@InputType()
export class RecordOtConsumableInput {
  @Field(() => ID) @IsNotEmpty() booking_id: string;
  @Field(() => ID) @IsNotEmpty() drug_id: string;
  @Field(() => ID, { nullable: true }) @IsOptional() batch_id?: string;
  @Field(() => Int) @IsInt() @Min(1) quantity: number;
  @Field({ nullable: true }) @IsOptional() implant_serial_no?: string;
}
