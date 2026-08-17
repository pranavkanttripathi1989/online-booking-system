import { ObjectType, Field, ID } from '@nestjs/graphql';
import { UserErrorType } from '../../organizations/entities/organization.entity';

@ObjectType('EmailTemplate')
export class EmailTemplateType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field() type: string; // exposes the TemplateType enum as a plain string (Rule 9 — frontend treats it as free text)
  @Field() subject: string;
  @Field() body: string;
  @Field(() => [String]) variables: string[];
  @Field() is_active: boolean;
}

@ObjectType('EmailTemplateMutationResult')
export class EmailTemplateMutationResultType {
  @Field() success: boolean;
  @Field(() => [UserErrorType]) userErrors: UserErrorType[];
  @Field(() => EmailTemplateType, { nullable: true }) template?: EmailTemplateType;
}
