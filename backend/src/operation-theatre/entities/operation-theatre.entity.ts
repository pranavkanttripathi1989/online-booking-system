import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

// REQ179 (IPD slice 3). client_org_id is deliberately not exposed — a
// filtering/ownership column, not display data, matching every other
// tenant-scoped entity in this schema.

@ObjectType('OperationTheatre')
export class OperationTheatreType {
  @Field(() => ID) id: string;
  @Field(() => ID) clinic_id: string;
  @Field() name: string;
  @Field(() => Int) default_turnaround_minutes: number;
  @Field() is_active: boolean;
  @Field() created_at: Date;
}

@ObjectType('OtBookingStaff')
export class OtBookingStaffType {
  @Field(() => ID) id: string;
  @Field(() => ID) user_id: string;
  @Field({ nullable: true }) user_name?: string;
  @Field() role: string;
}

@ObjectType('OtChecklistItem')
export class OtChecklistItemType {
  @Field() key: string;
  @Field() label: string;
  @Field() checked: boolean;
}

@ObjectType('OtChecklist')
export class OtChecklistType {
  @Field(() => ID) id: string;
  @Field() phase: string;
  @Field(() => [OtChecklistItemType]) items: OtChecklistItemType[];
  @Field({ nullable: true }) completed_by_name?: string;
  @Field({ nullable: true }) completed_at?: Date;
}

@ObjectType('OtNote')
export class OtNoteType {
  @Field(() => ID) id: string;
  @Field(() => ID) booking_id: string;
  @Field() pre_op_diagnosis: string;
  @Field() procedure_performed: string;
  @Field() findings: string;
  @Field() complications: string;
  @Field() post_op_diagnosis: string;
  @Field() post_op_instructions: string;
  @Field({ nullable: true }) author_name?: string;
  @Field({ nullable: true }) signed_at?: Date;
  @Field() locked: boolean;
}

@ObjectType('OtConsumable')
export class OtConsumableType {
  @Field(() => ID) id: string;
  @Field(() => ID) drug_id: string;
  @Field({ nullable: true }) drug_name?: string;
  @Field(() => Int) quantity: number;
  @Field({ nullable: true }) implant_serial_no?: string;
  @Field({ nullable: true }) recorded_by_name?: string;
  @Field() created_at: Date;
}

@ObjectType('OtBooking')
export class OtBookingType {
  @Field(() => ID) id: string;
  @Field(() => ID) theatre_id: string;
  @Field({ nullable: true }) theatre_name?: string;
  @Field(() => ID) admission_id: string;
  @Field({ nullable: true }) admission_number?: string;
  @Field({ nullable: true }) patient_name?: string;
  @Field() procedure_name: string;
  @Field(() => ID) primary_surgeon_clinician_id: string;
  @Field({ nullable: true }) primary_surgeon_name?: string;
  @Field(() => ID, { nullable: true }) anesthetist_clinician_id?: string;
  @Field({ nullable: true }) anesthetist_name?: string;
  @Field() start_at: Date;
  @Field() end_at: Date;
  @Field(() => Int) turnaround_minutes: number;
  @Field() status: string;
  @Field({ nullable: true }) cancel_reason?: string;
  @Field({ nullable: true }) notes?: string;
  @Field(() => [OtBookingStaffType]) staff: OtBookingStaffType[];
  @Field(() => [OtChecklistType]) checklists: OtChecklistType[];
  @Field(() => [OtConsumableType]) consumables: OtConsumableType[];
  @Field() created_at: Date;
}

@ObjectType('OtUserError')
export class OtUserErrorType {
  @Field() message: string;
}

@ObjectType('OtMutationResult')
export class OtMutationResultType {
  @Field() success: boolean;
  @Field(() => [OtUserErrorType]) userErrors: OtUserErrorType[];
}
