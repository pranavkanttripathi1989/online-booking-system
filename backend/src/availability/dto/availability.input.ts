import { InputType, Field, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsInt, IsBoolean, IsString, IsIn, Min, Max } from 'class-validator';

// Shared { limit } shape for manager/Availability.jsx's/manager/Blocks.jsx's
// availabilities(search)/spacerBlocks(search)/roomBlocks(search) queries.
@InputType('SearchInput')
export class SearchInput {
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() limit?: number;
}

// Matches manager/Availability.jsx's actual submitted mutation input exactly
// (snake_case) — the query response above is camelCase; this asymmetry is
// the frontend's real, live contract (backend-api-requirements-master-plan.md §1).
@InputType('CreateAvailabilityInput')
export class CreateAvailabilityInput {
  @Field() @IsNotEmpty() clinician_id: string;
  @Field() @IsNotEmpty() clinic_id: string;
  @Field({ nullable: true }) @IsOptional() room_id?: string;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(0) @Max(6) day_of_week?: number;
  @Field() @IsNotEmpty() start_time: string;
  @Field() @IsNotEmpty() end_time: string;
  @Field() @IsIn(['daily', 'weekly', 'monthly', 'custom']) recurrence_type: string;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() exclude_weekends?: boolean;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() exclude_saturday?: boolean;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() exclude_sunday?: boolean;
  @Field({ nullable: true }) @IsOptional() @IsString() valid_from?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() valid_until?: string;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_active?: boolean;
  @Field({ nullable: true }) @IsOptional() @IsString() custom_dates?: string;
}

@InputType('UpdateAvailabilityInput')
export class UpdateAvailabilityInput extends CreateAvailabilityInput {}

// clinician/Availability.jsx's own thinner self-service input — camelCase,
// a genuinely different (and smaller) field set than the manager surface
// above, both backed by the same ClinicianAvailability table.
@InputType('ClinicianAvailabilityInput')
export class ClinicianAvailabilityInput {
  @Field({ nullable: true }) @IsOptional() id?: string;
  @Field() @IsNotEmpty() clinicianId: string;
  @Field() @IsIn(['single', 'daily', 'weekly', 'monthly']) recurrenceType: string;
  @Field({ nullable: true }) @IsOptional() dayOfWeek?: string;
  @Field() @IsNotEmpty() startTime: string;
  @Field() @IsNotEmpty() endTime: string;
  @Field({ nullable: true }) @IsOptional() roomId?: string;
  @Field({ nullable: true }) @IsOptional() validFrom?: string;
  @Field({ nullable: true }) @IsOptional() validUntil?: string;
}

@InputType('LunchBreakInput')
export class LunchBreakInput {
  @Field({ nullable: true }) @IsOptional() id?: string;
  @Field() @IsNotEmpty() clinicianId: string;
  @Field() @IsNotEmpty() dayOfWeek: string;
  @Field() @IsNotEmpty() startTime: string;
  @Field() @IsNotEmpty() endTime: string;
}
