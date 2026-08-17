import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

// Registered 'ThreadParticipant'/'ThreadMessage'/'MessageThread' — from-scratch
// design against messages/index.jsx's MockStore shape (next-10-features-
// implementation-plan.md #10, same situation Test Results was in). Directly
// replaces MockStore.subscribe's fake local pub-sub, which is not real-time
// across browser tabs/sessions today.

@ObjectType('ThreadParticipant')
export class ThreadParticipantType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field() role: string;
}

@ObjectType('ThreadMessage')
export class ThreadMessageType {
  @Field(() => ID) id: string;
  @Field(() => ID) from_id: string;
  @Field() from_name: string;
  @Field() body: string;
  @Field() sent_at: Date;
  @Field() read: boolean;
}

@ObjectType('MessageThread')
export class MessageThreadType {
  @Field(() => ID) id: string;
  @Field(() => [ThreadParticipantType]) participants: ThreadParticipantType[];
  @Field({ nullable: true }) last_message?: string;
  @Field() last_activity: Date;
  @Field(() => Int) unread_count: number;
  @Field(() => [ThreadMessageType], { nullable: true }) messages?: ThreadMessageType[];
}
