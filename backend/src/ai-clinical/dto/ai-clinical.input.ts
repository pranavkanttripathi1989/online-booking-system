import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType('StartTranscriptionSessionInput')
export class StartTranscriptionSessionInput {
  @Field(() => ID) @IsNotEmpty() encounter_id: string;
  // FR-AI-01 — "refuse to record without it": the service rejects unless
  // this is explicitly true, never defaults it.
  @Field() @IsBoolean() consent_given: boolean;
}

@InputType('SubmitTranscriptionInput')
export class SubmitTranscriptionInput {
  @Field(() => ID) @IsNotEmpty() session_id: string;
  // Base64-encoded audio; never persisted as a column (FR-AI-07) — see
  // ai-clinical.service.ts's own comment on where it's discarded.
  @Field() @IsString() @IsNotEmpty() audio_base64: string;
  @Field(() => Int) @IsInt() @Min(1) duration_seconds: number;
  @Field({ nullable: true }) @IsOptional() @IsIn(['en', 'hi']) language_hint?: string;
}

@InputType('StructureTranscriptSessionInput')
export class StructureTranscriptSessionInput {
  @Field(() => ID) @IsNotEmpty() session_id: string;
}

@InputType('AiProviderCredentialFieldInput')
export class AiProviderCredentialFieldInput {
  @Field() @IsNotEmpty() key: string;
  // @IsString, not @IsNotEmpty — matches
  // UpdateNotificationProviderConfigInput's own precedent: an empty value
  // is meaningful here ("keep the existing secret"), not invalid input.
  @Field() @IsString() value: string;
}

@InputType('UpdateAiProviderConfigInput')
export class UpdateAiProviderConfigInput {
  @Field() @IsNotEmpty() provider: string;
  @Field(() => [AiProviderCredentialFieldInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiProviderCredentialFieldInput)
  credentials: AiProviderCredentialFieldInput[];
}
