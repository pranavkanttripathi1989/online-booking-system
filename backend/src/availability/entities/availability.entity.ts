import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType('AvailabilityClinician')
export class AvailabilityClinicianType {
  @Field(() => ID) id: string;
  @Field() firstName: string;
  @Field() lastName: string;
}

@ObjectType('AvailabilityClinic')
export class AvailabilityClinicType {
  @Field(() => ID) id: string;
  @Field() name: string;
}

@ObjectType('AvailabilityRoom')
export class AvailabilityRoomType {
  @Field(() => ID) id: string;
  // Rooms has no `name` column — room_number → roomNumber, same mapping
  // convention already established in rooms.service.ts/appointments (Rule 9).
  @Field() roomNumber: string;
}

// Registered 'Availability' — matches manager/Availability.jsx's
// GetManagerAvailabilityData query exactly (camelCase response fields, note
// the mutation *input* is snake_case — that asymmetry is the frontend's real,
// live contract, not a bug, per backend-api-requirements-master-plan.md §1).
@ObjectType('Availability')
export class AvailabilityType {
  @Field(() => ID) id: string;
  @Field(() => ID) clinicianId: string;
  @Field(() => ID) clinicId: string;
  @Field(() => ID, { nullable: true }) roomId?: string;
  @Field(() => Int, { nullable: true }) dayOfWeek?: number;
  @Field() startTime: string;
  @Field() endTime: string;
  @Field() recurrenceType: string;
  @Field() excludeWeekends: boolean;
  @Field() excludeSaturday: boolean;
  @Field() excludeSunday: boolean;
  @Field() validFrom: Date;
  @Field({ nullable: true }) validUntil?: Date;
  @Field() isActive: boolean;
  @Field() mode: string;
  @Field(() => Int, { nullable: true }) capacity?: number;
  @Field(() => Int) overbookAllowance: number;
  // REQ119 — was write-only (accepted by CreateAvailabilityInput/
  // UpdateAvailabilityInput, never returned) before this slice built the
  // interleaving algorithm that actually reads it.
  @Field(() => Int, { nullable: true }) walkinRatio?: number;
  @Field(() => AvailabilityClinicianType) clinician: AvailabilityClinicianType;
  @Field(() => AvailabilityClinicType) clinic: AvailabilityClinicType;
  @Field(() => AvailabilityRoomType, { nullable: true }) room?: AvailabilityRoomType;
}

@ObjectType('AvailabilityUserError')
export class AvailabilityUserErrorType {
  @Field() message: string;
}

@ObjectType('AvailabilityMutationResult')
export class AvailabilityMutationResultType {
  @Field() success: boolean;
  @Field(() => [AvailabilityUserErrorType]) userErrors: AvailabilityUserErrorType[];
  @Field(() => AvailabilityType, { nullable: true }) availability?: AvailabilityType;
}

// clinician/Availability.jsx's own thinner self-service surface — same
// ClinicianAvailability table, a narrower field set, direct {id} return
// (matches that page's saveClinicianAvailability/saveLunchBreak exactly).
@ObjectType('ClinicianAvailabilitySlot')
export class ClinicianAvailabilitySlotType {
  @Field(() => ID) id: string;
  @Field(() => Int, { nullable: true }) dayOfWeek?: number;
  @Field() startTime: string;
  @Field() endTime: string;
  @Field() recurrenceType: string;
  @Field({ nullable: true }) validFrom?: Date;
  @Field({ nullable: true }) validUntil?: Date;
  @Field(() => ID, { nullable: true }) roomId?: string;
  @Field({ nullable: true }) mode?: string;
  @Field(() => Int, { nullable: true }) capacity?: number;
}

// REQ017 US-CAL-01/02/03: what the booking UI needs to render a "join this
// session" card in place of a discrete time-slot grid. Nullable at the
// resolver level — no matching session/hybrid window on this date is a
// real, expected "not applicable" outcome, not an error.
@ObjectType('SessionAvailability')
export class SessionAvailabilityType {
  @Field() mode: string;
  @Field(() => Int) capacity: number;
  @Field(() => Int) overbookAllowance: number;
  @Field(() => Int) bookedCount: number;
  @Field(() => Int) remaining: number;
  @Field() isFull: boolean;
  @Field(() => Int) estimatedWaitMinutes: number;
  @Field() startTime: string;
  @Field() endTime: string;
}

@ObjectType('LunchBreakSlot')
export class LunchBreakSlotType {
  @Field(() => ID) id: string;
  @Field(() => Int, { nullable: true }) dayOfWeek?: number;
  @Field() startTime: string;
  @Field() endTime: string;
}

@ObjectType('SavedIdResult')
export class SavedIdResultType {
  @Field(() => ID) id: string;
}

@ObjectType('AvailabilityClinicRef')
export class AvailabilityClinicRefType {
  @Field(() => ID) id: string;
}

@ObjectType('AvailabilityClinicianWithClinic')
export class AvailabilityClinicianWithClinicType {
  @Field(() => ID) id: string;
  @Field(() => AvailabilityClinicRefType, { nullable: true }) clinic?: AvailabilityClinicRefType;
}

@ObjectType('AvailabilityRoomOption')
export class AvailabilityRoomOptionType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field() roomNumber: string;
}
