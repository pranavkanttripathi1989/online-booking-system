import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

// admin/EmailTemplates.jsx's edit form only ever submits {subject, body} —
// type/variables stay read-only from that page. admin/Communications.jsx's
// Notification Templates tab additionally toggles is_active.
@InputType('UpdateEmailTemplateInput')
export class UpdateEmailTemplateInput {
  @Field() @IsNotEmpty() subject: string;
  @Field() @IsNotEmpty() body: string;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_active?: boolean;
}
