import { InputType, Field, ID, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

@InputType()
export class SkipQueueEntryInput {
  @Field(() => ID)
  @IsNotEmpty()
  queue_entry_id: string;

  @Field({ nullable: true })
  @IsOptional()
  reason?: string;

  // US-QUE-05: "after N other patients have been served". Defaults to 3
  // when not supplied — REQ019's own text names no specific number.
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  return_after?: number;
}

@InputType()
export class TransferQueueEntryInput {
  @Field(() => ID)
  @IsNotEmpty()
  queue_entry_id: string;

  @Field(() => ID)
  @IsNotEmpty()
  target_clinician_id: string;
}
