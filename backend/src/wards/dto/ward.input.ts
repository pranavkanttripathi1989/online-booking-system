import { InputType, Field, ID, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsIn, IsBoolean, IsInt, Min } from 'class-validator';

// REQ179 (IPD slice 1). Every @Field here carries at least one
// class-validator decorator: the global ValidationPipe runs with
// whitelist+forbidNonWhitelisted, so an undecorated field is not merely
// unvalidated — it is silently stripped and then rejected as "should not
// exist" (the documented bug class that has bitten this codebase four times).

// Free-text in the schema by convention (Rooms.room_type / Resources.type),
// but constrained at the API boundary so a typo becomes a validation error
// rather than a ward nobody can filter for. Extend the list, don't remove it.
export const WARD_TYPES = [
  'general',
  'semi_private',
  'private',
  'deluxe',
  'suite',
  'icu',
  'hdu',
  'nicu',
  'picu',
  'maternity',
  'isolation',
  'day_care',
] as const;

export const GENDER_POLICIES = ['male', 'female', 'mixed'] as const;

export const BED_STATUSES = ['available', 'occupied', 'reserved', 'cleaning', 'blocked'] as const;

@InputType()
export class WardInput {
  @Field() @IsNotEmpty() name: string;

  @Field(() => ID) @IsNotEmpty() clinic_id: string;

  @Field({ nullable: true }) @IsOptional() @IsIn(WARD_TYPES as unknown as string[]) ward_type?: string;

  @Field({ nullable: true }) @IsOptional() floor?: string;

  @Field({ nullable: true }) @IsOptional() @IsIn(GENDER_POLICIES as unknown as string[]) gender_policy?: string;

  // A Products row, so the room-day rate inherits resolveServicePrice()'s
  // payer-tariff/branch-override/category chain rather than a bare price
  // column here. Validated cross-domain (Hard Rule 6) in the service.
  @Field(() => ID, { nullable: true }) @IsOptional() bed_charge_product_id?: string;

  @Field(() => ID, { nullable: true }) @IsOptional() nursing_charge_product_id?: string;

  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_active?: boolean;
}

@InputType()
export class BedInput {
  @Field(() => ID) @IsNotEmpty() ward_id: string;

  @Field() @IsNotEmpty() bed_number: string;

  @Field({ nullable: true }) @IsOptional() @IsIn(WARD_TYPES as unknown as string[]) bed_type?: string;

  @Field(() => ID, { nullable: true }) @IsOptional() bed_charge_product_id?: string;

  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_active?: boolean;
}

// Blocking a bed is not a status edit — it writes a real BedOccupancies row
// so the exclusion constraint treats it exactly like an admission, which is
// the whole point of the single-timeline-table design.
@InputType()
export class BlockBedInput {
  @Field(() => ID) @IsNotEmpty() bed_id: string;

  @Field({ nullable: true }) @IsOptional() @IsIn(['cleaning', 'blocked'] as string[]) occupancy_kind?: string;

  @Field() @IsNotEmpty() reason: string;

  // Open-ended when omitted — the bed stays blocked until explicitly released.
  @Field({ nullable: true }) @IsOptional() until?: Date;
}

@InputType()
export class BedBoardFilterInput {
  @Field(() => ID) @IsNotEmpty() clinic_id: string;

  @Field(() => ID, { nullable: true }) @IsOptional() ward_id?: string;

  @Field({ nullable: true }) @IsOptional() @IsIn(WARD_TYPES as unknown as string[]) ward_type?: string;

  @Field({ nullable: true }) @IsOptional() @IsIn(BED_STATUSES as unknown as string[]) status?: string;

  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(1) limit?: number;
}
