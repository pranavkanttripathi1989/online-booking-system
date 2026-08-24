import { InputType, Field, ID, Int, Float } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsInt, Min, IsDateString } from 'class-validator';

// REQ022 (pharmacy P0) — receiving a batch of stock for one drug at one clinic.
@InputType('ReceiveStockInput')
export class ReceiveStockInput {
  @Field(() => ID) @IsNotEmpty() drug_id: string;
  @Field(() => ID) @IsNotEmpty() clinic_id: string;
  @Field() @IsNotEmpty() batch_number: string;
  @Field() @IsDateString() expiry_date: string;
  @Field(() => Int) @IsInt() @Min(1) quantity: number;
  @Field(() => Float, { nullable: true }) @IsOptional() mrp?: number; // rupees at the GraphQL boundary
}

// A manual correction (breakage, count adjustment) — quantity_delta may be
// negative; a positive delta on an existing batch is deliberately NOT
// supported here (that's receiveStock, a distinct, separately-audited
// event type).
@InputType('AdjustStockInput')
export class AdjustStockInput {
  @Field(() => ID) @IsNotEmpty() batch_id: string;
  @Field(() => Int) quantity_delta: number;
  @Field({ nullable: true }) @IsOptional() notes?: string;
}

@InputType('DispensePrescriptionItemInput')
export class DispensePrescriptionItemInput {
  @Field(() => ID) @IsNotEmpty() prescription_item_id: string;
  @Field(() => ID) @IsNotEmpty() batch_id: string;
  @Field(() => Int) @IsInt() @Min(1) quantity: number;
}
