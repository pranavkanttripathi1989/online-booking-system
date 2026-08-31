import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsIn, IsISO8601 } from 'class-validator';

// Mirrors frontend/src/mocks/data/tasks.js's own TASK_TYPES/TASK_PRIORITIES/
// TASK_STATUSES exactly — the page this domain replaces the mock for.
export const TASK_TYPES = ['Follow-up call', 'Chase lab result', 'Insurance claim', 'Prescription renewal', 'General'];
export const TASK_PRIORITIES = ['Low', 'Medium', 'High'];
export const TASK_STATUSES = ['Open', 'In Progress', 'Done'];

@InputType('CreateTaskInput')
export class CreateTaskInput {
  @Field() @IsNotEmpty() subject: string;
  @Field({ nullable: true }) @IsOptional() @IsIn(TASK_TYPES) task_type?: string;
  @Field({ nullable: true }) @IsOptional() @IsIn(TASK_PRIORITIES) priority?: string;
  @Field({ nullable: true }) @IsOptional() @IsISO8601() due_date?: string;
  @Field(() => ID, { nullable: true }) @IsOptional() assigned_to_user_id?: string;
  @Field(() => ID, { nullable: true }) @IsOptional() patient_id?: string;
}

@InputType('TaskFilterInput')
export class TaskFilterInput {
  @Field({ nullable: true }) @IsOptional() @IsIn(TASK_STATUSES) status?: string;
  @Field({ nullable: true }) @IsOptional() @IsIn(TASK_PRIORITIES) priority?: string;
  @Field(() => ID, { nullable: true }) @IsOptional() assigned_to_user_id?: string;
}
