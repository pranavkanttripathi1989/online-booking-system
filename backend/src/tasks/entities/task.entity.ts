import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType('TaskAssignee')
export class TaskAssigneeType {
  @Field(() => ID) id: string;
  @Field() name: string;
}

@ObjectType('Task')
export class TaskType {
  @Field(() => ID) id: string;
  @Field() subject: string;
  @Field() task_type: string;
  @Field() priority: string;
  @Field() status: string;
  @Field({ nullable: true }) due_date?: Date;
  @Field(() => TaskAssigneeType, { nullable: true }) assigned_to?: TaskAssigneeType;
  @Field(() => ID, { nullable: true }) patient_id?: string;
  @Field({ nullable: true }) patient_name?: string;
  @Field(() => ID) created_by_user_id: string;
  @Field() created_at: Date;
}
