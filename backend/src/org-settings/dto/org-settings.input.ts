import { InputType, Field, Float, Int } from '@nestjs/graphql';
import { IsOptional, IsEmail, IsBoolean, IsInt, Min, IsNotEmpty } from 'class-validator';

@InputType('UpdateOrgCommunicationSettingsInput')
export class UpdateOrgCommunicationSettingsInput {
  @Field({ nullable: true }) @IsOptional() @IsNotEmpty() email_from_name?: string;
  @Field({ nullable: true }) @IsOptional() @IsEmail() email_from_address?: string;
  @Field({ nullable: true }) @IsOptional() @IsEmail() email_reply_to?: string;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() email_include_branding?: boolean;
}

@InputType('UpdateOrgBookingPoliciesInput')
export class UpdateOrgBookingPoliciesInput {
  @Field(() => Float, { nullable: true }) @IsOptional() @Min(0) no_show_fee?: number;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(0) slot_buffer_minutes?: number;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(0) max_reschedules_per_month?: number;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(0) data_retention_years?: number;
}
