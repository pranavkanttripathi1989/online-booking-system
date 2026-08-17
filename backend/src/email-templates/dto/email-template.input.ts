import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

// admin/EmailTemplates.jsx's edit form only ever submits {subject, body} —
// type/variables/is_active are read-only from this page.
@InputType('UpdateEmailTemplateInput')
export class UpdateEmailTemplateInput {
  @Field() @IsNotEmpty() subject: string;
  @Field() @IsNotEmpty() body: string;
}
