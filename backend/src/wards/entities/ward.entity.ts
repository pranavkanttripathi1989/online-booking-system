import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { ClinicType } from '../../clinics/entities/clinic.entity';

// REQ179 (IPD slice 1). client_org_id is deliberately not exposed on any of
// these types — it is a filtering/ownership column, not display data, matching
// every other tenant-scoped entity in this schema.

@ObjectType('Ward')
export class WardType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field() ward_type: string;
  @Field({ nullable: true }) floor?: string;
  @Field() gender_policy: string;
  @Field(() => ClinicType, { nullable: true }) clinic?: ClinicType;
  @Field(() => ID, { nullable: true }) bed_charge_product_id?: string;
  @Field({ nullable: true }) bed_charge_product_name?: string;
  // Rupees at the boundary; paise at rest. Resolved through the Products row,
  // so this is the ward's list rate before any payer tariff or branch
  // override — those apply per admission at charge time (slice 4).
  @Field(() => Float, { nullable: true }) bed_charge_price?: number;
  @Field(() => ID, { nullable: true }) nursing_charge_product_id?: string;
  @Field() is_active: boolean;
  // Denormalised counts for the ward list — computed per query, not stored.
  @Field(() => Int) total_beds: number;
  @Field(() => Int) occupied_beds: number;
  @Field(() => Int) available_beds: number;
  @Field() created_at: Date;
}

@ObjectType('Bed')
export class BedType {
  @Field(() => ID) id: string;
  @Field() bed_number: string;
  @Field({ nullable: true }) bed_type?: string;
  @Field() status: string;
  @Field() is_active: boolean;
  @Field(() => ID) ward_id: string;
  @Field({ nullable: true }) ward_name?: string;
  @Field({ nullable: true }) ward_type?: string;
  @Field(() => ID, { nullable: true }) bed_charge_product_id?: string;
  @Field() created_at: Date;
}

// One row of the live bed board: the bed plus whoever is in it right now.
// Deliberately a flat projection rather than nested Bed+Admission types — the
// board renders a grid, and a flat row keeps it to one query with no N+1.
@ObjectType('BedBoardEntry')
export class BedBoardEntryType {
  @Field(() => ID) bed_id: string;
  @Field() bed_number: string;
  @Field() status: string;
  @Field(() => ID) ward_id: string;
  @Field() ward_name: string;
  @Field() ward_type: string;
  @Field({ nullable: true }) floor?: string;

  // Populated only when the bed is genuinely occupied by a live admission.
  @Field(() => ID, { nullable: true }) admission_id?: string;
  @Field({ nullable: true }) admission_number?: string;
  @Field(() => ID, { nullable: true }) patient_id?: string;
  @Field({ nullable: true }) patient_name?: string;
  @Field({ nullable: true }) attending_clinician_name?: string;
  @Field({ nullable: true }) admitted_at?: Date;
  @Field({ nullable: true }) expected_discharge_at?: Date;
  @Field({ nullable: true }) is_mlc?: boolean;
  @Field({ nullable: true }) is_critical?: boolean;

  // Populated for a non-admission hold (cleaning/blocked/reserved), so the
  // board can explain why a bed is unavailable rather than just greying it.
  @Field({ nullable: true }) hold_reason?: string;
  @Field({ nullable: true }) hold_until?: Date;
}

@ObjectType('BedBoardSummary')
export class BedBoardSummaryType {
  @Field(() => Int) total: number;
  @Field(() => Int) occupied: number;
  @Field(() => Int) available: number;
  @Field(() => Int) reserved: number;
  @Field(() => Int) cleaning: number;
  @Field(() => Int) blocked: number;
  // Occupied / (total - blocked), as a percentage. Blocked beds are excluded
  // from the denominator: a bed out of service is not spare capacity.
  @Field(() => Float) occupancy_rate: number;
}

@ObjectType('BedBoard')
export class BedBoardType {
  @Field(() => BedBoardSummaryType) summary: BedBoardSummaryType;
  @Field(() => [BedBoardEntryType]) entries: BedBoardEntryType[];
}

@ObjectType('WardUserError')
export class WardUserErrorType {
  @Field() message: string;
}

@ObjectType('WardMutationResult')
export class WardMutationResultType {
  @Field() success: boolean;
  @Field(() => [WardUserErrorType]) userErrors: WardUserErrorType[];
}
