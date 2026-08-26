import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType('QueueEvent')
export class QueueEventType {
  @Field(() => ID) id: string;
  @Field() action: string;
  @Field({ nullable: true }) reason?: string;
  @Field() created_at: Date;
}

@ObjectType('QueueEntry')
export class QueueEntryType {
  @Field(() => ID) id: string;
  @Field(() => ID) appointment_id: string;
  @Field(() => ID) clinic_id: string;
  @Field(() => ID) clinician_id: string;
  @Field() patient_name: string;
  @Field(() => Int, { nullable: true }) token_no?: number;
  @Field() status: string;
  @Field() checked_in_at: Date;
  @Field({ nullable: true }) called_at?: Date;
  @Field(() => [QueueEventType]) events: QueueEventType[];
}

// US-QUE-03: now-serving, next N, and a retrospective average wait for
// today's served patients. US-QUE-04 (REQ117): predicted_wait_minutes is
// a rolling median across a trailing multi-day window — the predictive
// figure a waiting patient should see; average_wait_minutes stays
// today-only, for staff watching today's own pace.
@ObjectType('QueueBoard')
export class QueueBoardType {
  @Field(() => ID) clinician_id: string;
  @Field() clinician_name: string;
  @Field(() => QueueEntryType, { nullable: true }) now_serving?: QueueEntryType;
  @Field(() => [QueueEntryType]) waiting: QueueEntryType[];
  @Field(() => Int, { nullable: true }) average_wait_minutes?: number;
  @Field(() => Int, { nullable: true }) predicted_wait_minutes?: number;
}

// US-QUE-07: a completed appointment with no successful payment on record.
@ObjectType('UnbilledVisit')
export class UnbilledVisitType {
  @Field(() => ID) appointment_id: string;
  @Field() patient_name: string;
  @Field() clinician_name: string;
  @Field() appointment_time: Date;
}
