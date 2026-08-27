import { InputType, Field, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsIn, IsISO8601, IsInt, IsString, Length, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IntakeFieldResponseInput } from '../../intake-fields/dto/intake-field.input';

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
  // REQ026 (US-TEL-01) — previously write-only never-settable despite the
  // column existing (Appointments.type, @default("in_person")) and
  // calendar/index.jsx's own type filter and video/index.jsx already
  // expecting one — no mutation ever let a caller actually choose it.
  // getOrCreateEncounter() reads this back into Encounters.consultation_mode.
  @Field({ nullable: true }) @IsOptional() @IsIn(['in_person', 'video', 'home_visit']) type?: string;
  // REQ017 US-CAL-05, slot mode only — every listed resource must also be
  // free for the requested window (in addition to the clinician and room),
  // or the booking is rejected. Ignored for session/hybrid mode bookings in
  // this slice (out of scope — see PLAN under REQ017).
  @Field(() => [String], { nullable: true }) @IsOptional() resource_ids?: string[];
  // REQ052 (US-BOOK-06) — answers to whatever ClinicIntakeFieldConfig
  // items apply to this clinic/service; validated for required-field
  // completeness server-side in appointments.service.ts's create(), not
  // trusted from the client alone.
  @Field(() => [IntakeFieldResponseInput], { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => IntakeFieldResponseInput)
  intake_responses?: IntakeFieldResponseInput[];

  // P1-05 (BOOK-3) — client-generated, persisted across an app kill (BOOK-18)
  // so a resubmit after a crash/reload reuses the same key rather than
  // minting a new one. A repeat key is a no-op returning the original
  // appointment; see appointments.service.ts's create().
  @Field({ nullable: true }) @IsOptional() @IsString() @Length(8, 128) idempotency_key?: string;
  // P1-05 (BOOK-2) — the token from a prior holdAppointmentSlot call for
  // this exact clinician/start_datetime, if the wizard held one. Missing,
  // wrong, or expired is never fatal to booking — only the EXCLUDE
  // constraint is; a valid token just gets released on success.
  @Field({ nullable: true }) @IsOptional() @IsString() @Length(8, 128) hold_token?: string;
  // REQ026 (US-TEL-07) — set only when this booking is a "advise
  // in-person visit" escalation from a teleconsultation encounter.
  // appointments.service.ts's create() validates the caller is that
  // encounter's own treating clinician before honoring it (Hard Rule 6 —
  // a client-supplied cross-domain id is never trusted alone).
  @Field({ nullable: true }) @IsOptional() escalated_from_encounter_id?: string;
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

// REQ120 — "shift a clinician's whole day" (e.g. running 2 hours behind,
// or out sick and every appointment moves to the same slot next week):
// every target row shifts by the same delta, not a per-row new time each
// — the common front-desk request this slice scopes to (REQ017's own
// deferred "bulk-reschedule" note names no more specific shape than this).
@InputType('BulkRescheduleAppointmentsInput')
export class BulkRescheduleAppointmentsInput {
  @Field() @IsNotEmpty() clinician_id: string;
  // YYYY-MM-DD — the source day whose appointments are being shifted.
  @Field() @IsISO8601() date: string;
  // Minutes to shift by; negative moves earlier. Validated non-zero in
  // the service layer (a zero shift is a no-op worth rejecting explicitly
  // rather than silently succeeding at nothing).
  @Field(() => Int) @IsInt() shift_minutes: number;
}
