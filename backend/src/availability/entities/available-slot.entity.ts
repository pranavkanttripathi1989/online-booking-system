import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType('AvailableSlotClinician')
export class AvailableSlotClinicianType {
  @Field(() => ID) id: string;
  @Field() full_name: string;
}

// Registered 'AvailableSlot' — matches AVAILABLE_SLOTS_QUERY exactly
// (frontend/src/graphql/queries.js), consumed by
// components/BookingWizard/BookingStep3Slot.jsx. `id` is a deterministic,
// non-persisted composite (clinicianId-date-HH:mm) — createAppointment never
// trusts it as proof of availability, it re-runs the real conflict check
// server-side (next-10-features-implementation-plan.md §3).
@ObjectType('AvailableSlot')
export class AvailableSlotType {
  @Field(() => ID) id: string;
  @Field() start_datetime: Date;
  @Field() end_datetime: Date;
  @Field(() => Int) duration_minutes: number;
  @Field() is_available: boolean;
  @Field(() => AvailableSlotClinicianType) clinician: AvailableSlotClinicianType;
}
