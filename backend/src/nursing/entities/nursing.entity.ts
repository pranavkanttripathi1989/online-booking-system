import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

// REQ179 (IPD slice 2). client_org_id is deliberately not exposed on any of
// these types — a filtering/ownership column, not display data, matching
// every other tenant-scoped entity in this schema.

@ObjectType('IpdMedicationOrder')
export class IpdMedicationOrderType {
  @Field(() => ID) id: string;
  @Field(() => ID) drug_id: string;
  @Field({ nullable: true }) drug_name?: string;
  @Field() dose: string;
  @Field({ nullable: true }) dose_unit?: string;
  @Field() route: string;
  @Field() frequency: string;
  @Field(() => [String], { nullable: true }) schedule_times?: string[];
  @Field() is_prn: boolean;
  @Field({ nullable: true }) prn_indication?: string;
  @Field() start_at: Date;
  @Field({ nullable: true }) stop_at?: Date;
  @Field() status: string;
  @Field({ nullable: true }) hold_reason?: string;
  @Field() is_high_alert: boolean;
  @Field({ nullable: true }) instructions?: string;
  @Field(() => ID) ordered_by_clinician_id: string;
  @Field({ nullable: true }) ordered_by_name?: string;
  @Field() created_at: Date;
}

@ObjectType('MedicationAdministration')
export class MedicationAdministrationType {
  @Field(() => ID) id: string;
  @Field(() => ID) order_id: string;
  @Field(() => ID) drug_id: string;
  @Field({ nullable: true }) drug_name?: string;
  @Field({ nullable: true }) dose?: string;
  @Field({ nullable: true }) route?: string;
  @Field() is_high_alert: boolean;
  @Field() scheduled_at: Date;
  @Field({ nullable: true }) administered_at?: Date;
  @Field() status: string;
  @Field({ nullable: true }) dose_given?: string;
  @Field({ nullable: true }) site?: string;
  @Field({ nullable: true }) hold_reason?: string;
  @Field({ nullable: true }) administered_by_name?: string;
  @Field({ nullable: true }) witness_name?: string;
  @Field({ nullable: true }) notes?: string;
}

@ObjectType('IntakeOutputRecord')
export class IntakeOutputRecordType {
  @Field(() => ID) id: string;
  @Field() direction: string;
  @Field() category: string;
  @Field(() => Int) volume_ml: number;
  @Field() recorded_at: Date;
  @Field() shift: string;
  @Field({ nullable: true }) notes?: string;
  @Field({ nullable: true }) recorded_by_name?: string;
}

// The running balance for a window — derived at read time from
// IntakeOutputRecords, never stored (this schema's own "store the minimum,
// derive at read time" convention).
@ObjectType('IntakeOutputBalance')
export class IntakeOutputBalanceType {
  @Field(() => Int) total_intake_ml: number;
  @Field(() => Int) total_output_ml: number;
  @Field(() => Int) balance_ml: number;
  @Field() window_start: Date;
  @Field() window_end: Date;
}

@ObjectType('AdmissionNoteAddendum')
export class AdmissionNoteAddendumType {
  @Field(() => ID) id: string;
  @Field() content: string;
  @Field({ nullable: true }) reason?: string;
  @Field() created_at: Date;
  @Field({ nullable: true }) author_name?: string;
}

@ObjectType('AdmissionNote')
export class AdmissionNoteType {
  @Field(() => ID) id: string;
  @Field() note_kind: string;
  @Field() content: string;
  @Field({ nullable: true }) subjective?: string;
  @Field({ nullable: true }) objective?: string;
  @Field({ nullable: true }) assessment?: string;
  @Field({ nullable: true }) plan?: string;
  @Field({ nullable: true }) shift?: string;
  @Field() note_datetime: Date;
  @Field({ nullable: true }) author_name?: string;
  @Field({ nullable: true }) signed_at?: Date;
  @Field() locked: boolean;
  @Field(() => [AdmissionNoteAddendumType]) addenda: AdmissionNoteAddendumType[];
  @Field() created_at: Date;
}

@ObjectType('ShiftHandover')
export class ShiftHandoverType {
  @Field(() => ID) id: string;
  @Field(() => ID) ward_id: string;
  @Field({ nullable: true }) ward_name?: string;
  @Field() from_shift: string;
  @Field() to_shift: string;
  @Field() handover_at: Date;
  @Field() situation: string;
  @Field() background: string;
  @Field() assessment: string;
  @Field() recommendation: string;
  @Field({ nullable: true }) pending_tasks?: string;
  @Field({ nullable: true }) from_user_name?: string;
  @Field({ nullable: true }) to_user_name?: string;
  @Field({ nullable: true }) acknowledged_at?: Date;
}

@ObjectType('NursingUserError')
export class NursingUserErrorType {
  @Field() message: string;
}

@ObjectType('NursingMutationResult')
export class NursingMutationResultType {
  @Field() success: boolean;
  @Field(() => [NursingUserErrorType]) userErrors: NursingUserErrorType[];
}
