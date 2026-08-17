import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsIn, IsISO8601 } from 'class-validator';

// Matches components/BookingWizard/BookingStep5Confirm.jsx's actual submitted
// shape exactly: { patient_id, clinician_id, service_id, clinic_id, slot_id,
// start_datetime, notes }. slot_id is accepted but never trusted as proof of
// availability — the service layer re-runs the real conflict check server-side
// (see appointments.service.ts, matches next-10-features-implementation-plan.md's
// slot-stability note). room_id/duration_minutes are deliberately absent —
// assigned/derived server-side, since the frontend never collects them here.
@InputType('AppointmentInput')
export class AppointmentInput {
  @Field() @IsNotEmpty() patient_id: string;
  @Field() @IsNotEmpty() clinician_id: string;
  @Field() @IsNotEmpty() service_id: string;
  @Field() @IsNotEmpty() clinic_id: string;
  @Field({ nullable: true }) @IsOptional() slot_id?: string;
  @Field() @IsISO8601() start_datetime: string;
  @Field({ nullable: true }) @IsOptional() notes?: string;
}

// Matches appointments/edit.jsx's submitted shape exactly — a partial update,
// every field optional (the form only sends what actually changed plus status).
@InputType('AppointmentUpdateInput')
export class AppointmentUpdateInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsIn(['scheduled', 'confirmed', 'pending', 'completed', 'cancelled', 'no_show'])
  status?: string;

  @Field({ nullable: true }) @IsOptional() @IsISO8601() start_datetime?: string;
  @Field({ nullable: true }) @IsOptional() clinician_id?: string;
  @Field({ nullable: true }) @IsOptional() room_id?: string;
  @Field({ nullable: true }) @IsOptional() notes?: string;
  @Field({ nullable: true }) @IsOptional() cancellation_reason?: string;
}
