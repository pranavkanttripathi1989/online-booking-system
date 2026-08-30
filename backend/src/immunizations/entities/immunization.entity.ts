import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType('ImmunizationScheduleItem')
export class ImmunizationScheduleItemType {
  @Field(() => ID) id: string;
  @Field() vaccine_name: string;
  @Field(() => Int) dose_number: number;
  @Field(() => Int) due_age_days: number;
  @Field() is_active: boolean;
}

@ObjectType('ImmunizationRecord')
export class ImmunizationRecordType {
  @Field(() => ID) id: string;
  @Field() patient_id: string;
  @Field(() => ID, { nullable: true }) schedule_item_id?: string;
  @Field(() => ID, { nullable: true }) encounter_id?: string;
  @Field() vaccine_name: string;
  @Field(() => Int) dose_number: number;
  @Field() administered_at: string;
  @Field({ nullable: true }) administered_by_name?: string;
  @Field({ nullable: true }) batch_no?: string;
  @Field({ nullable: true }) site?: string;
  @Field({ nullable: true }) notes?: string;
}

// The computed "tracker" view -- one row per active schedule item, joined
// against whatever the patient has actually had, per requirement REQ167.
@ObjectType('ImmunizationStatusItem')
export class ImmunizationStatusItemType {
  @Field(() => ID) schedule_item_id: string;
  @Field() vaccine_name: string;
  @Field(() => Int) dose_number: number;
  @Field() due_date: string;
  @Field() status: string; // administered | overdue | due_soon | upcoming
  @Field(() => ImmunizationRecordType, { nullable: true }) administered_record?: ImmunizationRecordType;
}
