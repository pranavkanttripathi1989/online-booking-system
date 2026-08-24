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
