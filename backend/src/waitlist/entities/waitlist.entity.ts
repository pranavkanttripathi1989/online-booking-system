import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType('WaitlistEntry')
export class WaitlistEntryType {
  @Field(() => ID) id: string;
  @Field(() => ID) clinic_id: string;
  @Field(() => ID) clinician_id: string;
  @Field(() => ID) patient_id: string;
  @Field() waitlist_date: Date;
  @Field() status: string;
  @Field(() => Int) position: number;
  @Field({ nullable: true }) notified_at?: Date;
  @Field({ nullable: true }) claim_expires_at?: Date;
  @Field() created_at: Date;
}

@ObjectType('WaitlistUserError')
export class WaitlistUserErrorType {
  @Field() message: string;
}

@ObjectType('WaitlistMutationResult')
export class WaitlistMutationResultType {
  @Field() success: boolean;
  @Field(() => [WaitlistUserErrorType]) userErrors: WaitlistUserErrorType[];
  @Field(() => WaitlistEntryType, { nullable: true }) waitlistEntry?: WaitlistEntryType;
}
