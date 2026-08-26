import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

@InputType('JoinWaitlistInput')
export class JoinWaitlistInput {
  @Field(() => ID) @IsNotEmpty() clinician_id: string;
  // Date only (no time-of-day) — one waitlist per (clinician, date), not
  // per exact slot, per REQ106's own scope decision.
  @Field() @IsNotEmpty() date: string;
}
