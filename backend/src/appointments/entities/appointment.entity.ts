import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { ClinicianTypeInfoType } from '../../auth/entities/user.entity';
import { IntakeFieldResponseType } from '../../intake-fields/entities/intake-field.entity';

// Every nested type below is scoped to this module deliberately (not reused
// from clinics/clinicians/services/rooms' own entity classes) — AppointmentFields
// (frontend/src/graphql/queries.js) requests a narrower field set than those
// modules' full types expose, and several of those types declare non-nullable
// fields (e.g. ClinicianType.is_active/languages/clinics/services) this
// resolver never populates. A light, module-local type avoids a shape
// mismatch and a cross-module dependency for a handful of display fields.

@ObjectType('AppointmentPatient')
export class AppointmentPatientType {
  @Field(() => ID) id: string;
  @Field() first_name: string;
  @Field() last_name: string;
  @Field() full_name: string;
  @Field() email: string;
  @Field() phone: string;
  @Field() date_of_birth: Date;
  @Field({ nullable: true }) gender?: string;
}

@ObjectType('AppointmentClinician')
export class AppointmentClinicianType {
  @Field(() => ID) id: string;
  @Field() first_name: string;
  @Field() last_name: string;
  @Field() full_name: string;
  @Field({ nullable: true }) avatar_url?: string;
  @Field(() => ClinicianTypeInfoType, { nullable: true }) clinician_type?: ClinicianTypeInfoType;
}

@ObjectType('AppointmentClinic')
export class AppointmentClinicType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field({ nullable: true }) address?: string;
  @Field({ nullable: true }) city?: string;
  @Field({ nullable: true }) timezone?: string;
}

@ObjectType('AppointmentRoom')
export class AppointmentRoomType {
  @Field(() => ID) id: string;
  // Rooms has no `name` column (room_number is the real one) — same
  // room_number → name mapping already established in rooms.service.ts,
  // applied here at the appointments resolver boundary too (Rule 9).
  @Field() name: string;
}

@ObjectType('AppointmentService')
export class AppointmentServiceType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field(() => Int, { nullable: true }) duration_minutes?: number;
  @Field(() => Float, { nullable: true }) price?: number;
}

@ObjectType('AppointmentBookedByUser')
export class AppointmentBookedByUserType {
  @Field(() => ID) id: string;
  @Field() name: string;
}

@ObjectType('AppointmentStatusLog')
export class AppointmentStatusLogType {
  @Field(() => ID) id: string;
  @Field() status: string;
  @Field({ nullable: true }) reason?: string;
  @Field() created_at: Date;
  @Field(() => AppointmentBookedByUserType, { nullable: true }) changed_by_user?: AppointmentBookedByUserType;
}

// Registered 'Appointment' — matches AppointmentFields fragment exactly
// (frontend/src/graphql/queries.js), consumed by appointments/{index,detail,edit}.jsx,
// calendar/index.jsx, components/BookingWizard/BookingStep5Confirm.jsx.
@ObjectType('Appointment')
export class AppointmentType {
  @Field(() => ID) id: string;
  @Field({ nullable: true }) tenant_id?: string;
  @Field() start_datetime: Date;
  @Field() end_datetime: Date;
  @Field(() => Int) duration_minutes: number;
  @Field() status: string;
  // Appointments.type ("in_person" | "video"). The column has existed since the
  // model was written but was never exposed, so patient/Appointments.jsx had no
  // way to tell a video consultation from an in-person one and fabricated the
  // distinction. Nullable because the column is, with "in_person" as the
  // database default.
  @Field({ nullable: true }) type?: string;
  // REQ017 dual-mode scheduling: 'slot' (default, unchanged) | 'session' |
  // 'hybrid'. token_no is this appointment's sequential position within its
  // session/hybrid window; null for slot mode.
  @Field() booking_mode: string;
  @Field(() => Int, { nullable: true }) token_no?: number;
  // REQ052 (US-BOOK-06) — structured, not a raw JSON scalar, matching this
  // codebase's convention for every other Json column.
  @Field(() => [IntakeFieldResponseType], { nullable: true }) intake_responses?: IntakeFieldResponseType[];
  @Field({ nullable: true }) notes?: string;
  @Field({ nullable: true }) cancellation_reason?: string;
  @Field({ nullable: true }) reminder_sent_at?: Date;
  @Field() created_at: Date;
  @Field() updated_at: Date;
  @Field(() => AppointmentPatientType) patient: AppointmentPatientType;
  @Field(() => AppointmentClinicianType) clinician: AppointmentClinicianType;
  @Field(() => AppointmentClinicType) clinic: AppointmentClinicType;
  @Field(() => AppointmentRoomType, { nullable: true }) room?: AppointmentRoomType;
  @Field(() => AppointmentServiceType, { nullable: true }) service?: AppointmentServiceType;
  @Field(() => AppointmentBookedByUserType, { nullable: true }) booked_by_user?: AppointmentBookedByUserType;
  @Field(() => [AppointmentStatusLogType]) status_logs: AppointmentStatusLogType[];
}

@ObjectType('AppointmentPaginatorInfo')
export class AppointmentPaginatorInfoType {
  @Field(() => Int) count: number;
  @Field(() => Int) currentPage: number;
  @Field(() => Int) firstItem: number;
  @Field() hasMorePages: boolean;
  @Field(() => Int) lastItem: number;
  @Field(() => Int) lastPage: number;
  @Field(() => Int) perPage: number;
  @Field(() => Int) total: number;
}

@ObjectType('AppointmentPaginated')
export class AppointmentPaginatedType {
  @Field(() => [AppointmentType]) data: AppointmentType[];
  @Field(() => AppointmentPaginatorInfoType) paginatorInfo: AppointmentPaginatorInfoType;
}
