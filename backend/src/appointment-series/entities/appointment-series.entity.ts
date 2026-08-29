import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { AppointmentType } from '../../appointments/entities/appointment.entity';

// REQ163 (P2-10). status is only ever set by the two explicit user
// actions this domain exposes (create -> 'active', cancel -> 'cancelled')
// -- there is no stored 'completed' status; the frontend derives a
// "completed" display state from whether every occurrence below has
// reached a terminal appointment status. See AppointmentSeriesService's
// own comment for why this avoids needing a bookkeeping cron sweep.
@ObjectType('AppointmentSeries')
export class AppointmentSeriesType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field() series_type: string; // 'recurring' | 'treatment_plan' -- display metadata only
  @Field() status: string; // 'active' | 'cancelled'
  @Field(() => ID) clinic_id: string;
  @Field(() => ID) patient_id: string;
  @Field() created_at: Date;
  @Field() updated_at: Date;
  @Field(() => [AppointmentType]) appointments: AppointmentType[];
}

@ObjectType('AppointmentSeriesUserError')
export class AppointmentSeriesUserErrorType {
  @Field() message: string;
}

// One failure entry per occurrence that AppointmentsService.create()
// rejected (a genuine slot conflict, most often) -- never silently
// dropped, matching bulkReschedule()'s own partial-success precedent.
@ObjectType('AppointmentSeriesOccurrenceFailure')
export class AppointmentSeriesOccurrenceFailureType {
  @Field(() => Int) occurrence_index: number;
  @Field() message: string;
}

@ObjectType('CreateAppointmentSeriesResult')
export class CreateAppointmentSeriesResultType {
  @Field() success: boolean;
  @Field(() => [AppointmentSeriesUserErrorType]) userErrors: AppointmentSeriesUserErrorType[];
  @Field(() => AppointmentSeriesType, { nullable: true }) series?: AppointmentSeriesType;
  @Field(() => Int) attempted_count: number;
  @Field(() => Int) created_count: number;
  @Field(() => Int) failed_count: number;
  @Field(() => [AppointmentSeriesOccurrenceFailureType]) failures: AppointmentSeriesOccurrenceFailureType[];
}

@ObjectType('CancelAppointmentSeriesResult')
export class CancelAppointmentSeriesResultType {
  @Field() success: boolean;
  @Field(() => [AppointmentSeriesUserErrorType]) userErrors: AppointmentSeriesUserErrorType[];
  @Field(() => Int) attempted_count: number;
  @Field(() => Int) cancelled_count: number;
  @Field(() => Int) failed_count: number;
}
