import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType('ChecklistItem')
export class ChecklistItemType {
  @Field(() => ID) id: string;
  @Field(() => ID) clinic_id: string;
  @Field(() => ID, { nullable: true }) product_id?: string;
  @Field() label: string;
  @Field() is_required: boolean;
  @Field(() => Int) sort_order: number;
}

@ObjectType('ChecklistCompletion')
export class ChecklistCompletionType {
  @Field(() => ID) id: string;
  @Field(() => ID) checklist_item_id: string;
  @Field(() => ID) appointment_id: string;
  @Field(() => ID) completed_by_user_id: string;
  @Field() completed_at: Date;
}

@ObjectType('ChecklistUserError')
export class ChecklistUserErrorType {
  @Field() message: string;
}

@ObjectType('ChecklistItemMutationResult')
export class ChecklistItemMutationResultType {
  @Field() success: boolean;
  @Field(() => [ChecklistUserErrorType]) userErrors: ChecklistUserErrorType[];
  @Field(() => ChecklistItemType, { nullable: true }) checklistItem?: ChecklistItemType;
}
