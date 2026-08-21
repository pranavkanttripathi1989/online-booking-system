import { ObjectType, Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// REQ008/PLAN017 — admin/Communications.jsx's "OTP / Notification Provider"
// card. Describes one registry provider's id/label/required-field shape, so
// the frontend renders the right credential form without hardcoding it.
@ObjectType('NotificationProviderField')
export class NotificationProviderFieldType {
  @Field() key: string;
  @Field() label: string;
  @Field() type: string;
  @Field() required: boolean;
}

@ObjectType('NotificationProviderOption')
export class NotificationProviderOptionType {
  @Field() id: string;
  @Field() label: string;
  @Field() channel: string;
  @Field(() => [NotificationProviderFieldType]) fields: NotificationProviderFieldType[];
}

// The org's current configuration for a channel. credentials are never
// exposed here -- has_credentials is a boolean, matching the same
// write-only-secret principle as a session never returning its raw refresh
// token (account.entity.ts's SessionType).
@ObjectType('NotificationProviderConfig')
export class NotificationProviderConfigType {
  @Field() channel: string;
  @Field({ nullable: true }) provider?: string;
  @Field({ nullable: true }) sender_id?: string;
  @Field() has_credentials: boolean;
}

@ObjectType('NotificationProviderConfigResult')
export class NotificationProviderConfigResultType {
  @Field() success: boolean;
  @Field({ nullable: true }) message?: string;
}

@InputType('CredentialFieldInput')
export class CredentialFieldInput {
  @Field() @IsNotEmpty() key: string;
  // @IsString, not @IsNotEmpty -- an empty value is meaningful here
  // (updateMyProviderConfig's "keep the existing secret" signal), not invalid input.
  @Field() @IsString() value: string;
}

@InputType('UpdateNotificationProviderConfigInput')
export class UpdateNotificationProviderConfigInput {
  @Field() @IsNotEmpty() channel: string;
  @Field() @IsNotEmpty() provider: string;
  @Field(() => [CredentialFieldInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CredentialFieldInput)
  credentials: CredentialFieldInput[];
  @Field({ nullable: true }) @IsOptional() sender_id?: string;
}
