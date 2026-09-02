import { InputType, Field, ID } from '@nestjs/graphql';
import { IsArray, IsIn, IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// F-08 (project-plans/02-findings-register.md) — patient_id used to not
// exist on this input at all: TestResults.patient_id was written as
// undefined on every order, which made findAll()/findOne()'s own patient
// self-scoping (patient_id: user.patient_id ?? '__no_patient_link__')
// permanently dead code — a patient could never see their own lab
// results, because no result was ever linked to any patient_id. `patient`
// stays as the free-text display name (kept for the same denormalization
// reason patient_name exists on other domains), now populated from the
// selected patient rather than typed by hand.
// test_name/ordered_by/status/date_ordered are all derived server-side, not
// client-supplied — an ordering user shouldn't be able to submit a fabricated
// status or claim someone else placed the order.
@InputType('OrderTestInput')
export class OrderTestInput {
  @Field() @IsNotEmpty() patient_id: string;
  @Field() @IsNotEmpty() patient: string;
  @Field() @IsNotEmpty() testType: string;
}

// P2-13 — the previously-missing write path: nothing anywhere in this
// codebase could ever move a TestResults row past its default 'pending'
// status or attach a value. `flag` is restricted to the exact vocabulary
// the frontend's own flagColorsFor() already assumes (normal|high|low) —
// unenforced until now only because no row had ever been written with one.
export const TEST_RESULT_VALUE_FLAGS = ['normal', 'high', 'low'] as const;

@InputType('TestResultValueInput')
export class TestResultValueInput {
  @Field() @IsNotEmpty() name: string;
  @Field() @IsNotEmpty() value: string;
  @Field() @IsNotEmpty() ref: string;
  @Field() @IsIn(TEST_RESULT_VALUE_FLAGS as unknown as string[]) flag: string;
}

// status/values are the only caller-supplied clinical content here --
// date_completed is derived server-side (only on the transition into
// 'completed'), matching OrderTestInput's own stated rationale above.
// Whether `values` is required is a business rule ('completed' needs at
// least one, 'processing' may have none yet), enforced in the service --
// the same conditional-requirement shape this codebase already uses for
// e.g. approved_amount only being required when a status is 'approved'.
export const RECORD_TEST_RESULT_STATUSES = ['processing', 'completed'] as const;

@InputType('RecordTestResultInput')
export class RecordTestResultInput {
  @Field(() => ID) @IsNotEmpty() id: string;
  @Field() @IsIn(RECORD_TEST_RESULT_STATUSES as unknown as string[]) status: string;
  @Field(() => [TestResultValueInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestResultValueInput)
  values?: TestResultValueInput[];
}
