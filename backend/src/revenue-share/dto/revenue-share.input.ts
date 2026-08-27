import { InputType, Field, Float, ID, Int } from '@nestjs/graphql';
import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

@InputType()
export class RevenueShareRuleInput {
  @Field(() => String)
  @IsIn(['org', 'clinic', 'clinician'])
  scope!: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  clinic_id?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  clinician_id?: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  @Max(100)
  share_percentage!: number;
}

@InputType()
export class ComputeMonthlyPayoutsInput {
  @Field(() => ID)
  @IsString()
  clinic_id!: string;

  @Field(() => Int)
  @IsNumber()
  @Min(2020)
  @Max(2100)
  year!: number;

  @Field(() => Int)
  @IsNumber()
  @Min(1)
  @Max(12)
  month!: number;
}
