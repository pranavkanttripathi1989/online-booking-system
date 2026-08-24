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

// messages/index.jsx's "New Message" compose contact picker -- needs a
// Users.id (MessageParticipants.user_id's FK target), not a Patients.id/
// Clinicians.id, so it can't reuse the existing patients()/clinicians()
// queries directly (see messages.service.ts's messageableContacts).
@ObjectType('MessageableContact')
export class MessageableContactType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field() role: string;
}

// REQ058 (US-MSG-01).
@ObjectType('MessageAttachment')
export class MessageAttachmentType {
  @Field(() => ID) id: string;
  @Field() file_ref: string;
  @Field() mime_type: string;
  @Field() original_filename: string;
  @Field() created_at: Date;
}

@ObjectType('ThreadMessage')
export class ThreadMessageType {
  @Field(() => ID) id: string;
  @Field(() => ID) from_id: string;
  @Field() from_name: string;
  @Field() body: string;
  @Field() sent_at: Date;
  @Field() read: boolean;
  @Field(() => [MessageAttachmentType]) attachments: MessageAttachmentType[];
}

@ObjectType('MessageThread')
export class MessageThreadType {
  @Field(() => ID) id: string;
  @Field(() => [ThreadParticipantType]) participants: ThreadParticipantType[];
  @Field({ nullable: true }) last_message?: string;
  @Field() last_activity: Date;
  @Field(() => Int) unread_count: number;
  @Field(() => [ThreadMessageType], { nullable: true }) messages?: ThreadMessageType[];
  // REQ043/REQ024 -- shared-inbox assignment + SLA timer.
  @Field(() => ThreadParticipantType, { nullable: true }) assigned_to?: ThreadParticipantType;
  @Field({ nullable: true }) sla_due_at?: Date;
  // REQ058 (US-MSG-01) — staff_internal | patient_clinic (the latter is a
  // still-P1, not-yet-built story, see REQ058's own doc).
  @Field() thread_type: string;
  @Field(() => ID, { nullable: true }) department_id?: string;
  @Field(() => ID, { nullable: true }) clinic_id?: string;
}

// REQ058 (US-MSG-03).
@ObjectType('CannedReply')
export class CannedReplyType {
  @Field(() => ID) id: string;
  @Field() title: string;
  @Field() body: string;
  @Field() created_at: Date;
}

@ObjectType('CannedReplyUserError')
export class CannedReplyUserErrorType {
  @Field() message: string;
}

@ObjectType('CannedReplyMutationResult')
export class CannedReplyMutationResultType {
  @Field() success: boolean;
  @Field(() => [CannedReplyUserErrorType]) userErrors: CannedReplyUserErrorType[];
  @Field(() => CannedReplyType, { nullable: true }) cannedReply?: CannedReplyType;
}
