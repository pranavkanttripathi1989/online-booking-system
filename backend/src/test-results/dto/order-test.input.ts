import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

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
