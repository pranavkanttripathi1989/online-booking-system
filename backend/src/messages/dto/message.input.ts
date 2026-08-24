import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, ArrayMinSize, IsOptional } from 'class-validator';

// REQ058 (US-MSG-01) — department_id/clinic_id are both optional; omitted
// (the pre-existing default) creates an unscoped thread visible only to
// its explicit participants, exactly like every thread before this slice.
@InputType('CreateThreadInput')
export class CreateThreadInput {
  @Field(() => [ID]) @ArrayMinSize(1) participant_ids: string[];
  @Field() @IsNotEmpty() first_message: string;
  @Field(() => ID, { nullable: true }) @IsOptional() department_id?: string;
  @Field(() => ID, { nullable: true }) @IsOptional() clinic_id?: string;
}

// REQ058 (US-MSG-03).
@InputType('CreateCannedReplyInput')
export class CreateCannedReplyInput {
  @Field() @IsNotEmpty() title: string;
  @Field() @IsNotEmpty() body: string;
}

@InputType('UpdateCannedReplyInput')
export class UpdateCannedReplyInput {
  @Field({ nullable: true }) @IsOptional() title?: string;
  @Field({ nullable: true }) @IsOptional() body?: string;
}

// REQ058 (US-MSG-01) — the DB-row-creation half of the two-step upload
// pattern message-attachments.controller.ts's own POST /upload (multer,
// magic-byte check) already establishes -- matches
// attachments.controller.ts/createEncounterAttachment's own split exactly.
@InputType('CreateMessageAttachmentInput')
export class CreateMessageAttachmentInput {
  @Field(() => ID) @IsNotEmpty() message_id: string;
  @Field() @IsNotEmpty() file_ref: string;
  @Field() @IsNotEmpty() mime_type: string;
  @Field() @IsNotEmpty() original_filename: string;
}
