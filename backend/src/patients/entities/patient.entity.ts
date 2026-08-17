import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

// Matches PATIENT_DETAIL_QUERY's embedded appointments{} sub-selection
// (frontend/src/graphql/queries.js / EditPatientPage.jsx) exactly — narrower
// than full AppointmentFields, so a dedicated light type rather than the
// appointments module's AppointmentType (avoids a cross-module dependency
// and the non-nullable-field mismatch that would create).
@ObjectType('PatientAppointmentClinician')
export class PatientAppointmentClinicianType {
  @Field(() => ID) id: string;
  @Field() full_name: string;
}

@ObjectType('PatientAppointmentService')
export class PatientAppointmentServiceType {
  @Field(() => ID) id: string;
  @Field() name: string;
}

@ObjectType('PatientAppointmentClinic')
export class PatientAppointmentClinicType {
  @Field(() => ID) id: string;
  @Field() name: string;
}

@ObjectType('PatientAppointmentItem')
export class PatientAppointmentItemType {
  @Field(() => ID) id: string;
  @Field() start_datetime: Date;
  @Field() end_datetime: Date;
  @Field() status: string;
  @Field(() => PatientAppointmentClinicianType) clinician: PatientAppointmentClinicianType;
  @Field(() => PatientAppointmentServiceType, { nullable: true }) service?: PatientAppointmentServiceType;
  @Field(() => PatientAppointmentClinicType) clinic: PatientAppointmentClinicType;
}

@ObjectType('PatientAppointmentPaginatorInfo')
export class PatientAppointmentPaginatorInfoType {
  @Field(() => Int) total: number;
  @Field() hasMorePages: boolean;
}

@ObjectType('PatientAppointmentsPaginated')
export class PatientAppointmentsPaginatedType {
  @Field(() => [PatientAppointmentItemType]) data: PatientAppointmentItemType[];
  @Field(() => PatientAppointmentPaginatorInfoType) paginatorInfo: PatientAppointmentPaginatorInfoType;
}

// Registered 'Patient' — matches PatientFields fragment (frontend/src/graphql/queries.js),
// consumed verbatim by patients/index.jsx, CreatePatientPage.jsx, EditPatientPage.jsx,
// components/BookingWizard/BookingStep4Patient.jsx and BookingStep5Confirm.jsx.
@ObjectType('Patient')
export class PatientType {
  @Field(() => ID) id: string;
  @Field() first_name: string;
  @Field() last_name: string;
  @Field() full_name: string;
  @Field() email: string;
  @Field() phone: string;
  @Field() date_of_birth: Date;
  @Field({ nullable: true }) gender?: string;
  @Field({ nullable: true }) address?: string;
  // Patients has no `notes` column — PatientInput's `notes` maps onto the
  // semantically-closest existing column, `medical_notes` (backend-hard-rules.md
  // Rule 9: match the wire contract, not invent a redundant column).
  @Field({ nullable: true }) notes?: string;
  @Field() created_at: Date;
}

@ObjectType('PatientPaginatorInfo')
export class PatientPaginatorInfoType {
  @Field(() => Int) count: number;
  @Field(() => Int) currentPage: number;
  @Field() hasMorePages: boolean;
  @Field(() => Int) lastPage: number;
  @Field(() => Int) perPage: number;
  @Field(() => Int) total: number;
}

@ObjectType('PatientPaginated')
export class PatientPaginatedType {
  @Field(() => [PatientType]) data: PatientType[];
  @Field(() => PatientPaginatorInfoType) paginatorInfo: PatientPaginatorInfoType;
}
