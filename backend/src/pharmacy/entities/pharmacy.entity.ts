import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';

@ObjectType('DrugBatch')
export class DrugBatchType {
  @Field(() => ID) id: string;
  @Field(() => ID) drug_id: string;
  @Field(() => ID) clinic_id: string;
  @Field() batch_number: string;
  @Field() expiry_date: Date;
  @Field(() => Int) quantity_received: number;
  @Field(() => Int) quantity_remaining: number;
  @Field(() => Float, { nullable: true }) mrp?: number;
  @Field() created_at: Date;
  // REQ022 (US-PHR-09, scoped) — populated only by nearExpiryBatches(); the
  // real day-to-day drugBatches() query leaves this undefined, matching
  // this schema's own convention of only resolving what a given call site
  // actually needs.
  @Field({ nullable: true }) drug_name?: string;
}

// REQ022 (US-PHR-09, scoped).
@ObjectType('LowStockDrug')
export class LowStockDrugType {
  @Field(() => ID) drug_id: string;
  @Field() drug_name: string;
  @Field(() => Int) reorder_level: number;
  @Field(() => Int) quantity_on_hand: number;
}

@ObjectType('StockMovement')
export class StockMovementType {
  @Field(() => ID) id: string;
  @Field(() => ID) batch_id: string;
  @Field() movement_type: string;
  @Field(() => Int) quantity_delta: number;
  @Field({ nullable: true }) reference_type?: string;
  @Field({ nullable: true }) reference_id?: string;
  @Field({ nullable: true }) notes?: string;
  @Field() created_at: Date;
}

// REQ126 (US-RX-09) — one row per not-yet-fully-dispensed prescription
// item, across the whole pharmacy, not scoped to one patient the way the
// existing per-patient search flow requires searching first.
@ObjectType('PendingDispenseItem')
export class PendingDispenseItemType {
  @Field(() => ID) prescription_item_id: string;
  @Field(() => ID) prescription_id: string;
  @Field() issued_at: Date;
  @Field(() => ID) patient_id: string;
  @Field() patient_name: string;
  @Field(() => ID) drug_id: string;
  @Field() drug_name: string;
  @Field() dose: string;
  @Field() frequency: string;
  @Field(() => Int) qty: number;
  @Field(() => Int) dispensed_qty: number;
  @Field(() => Int) remaining_qty: number;
}
