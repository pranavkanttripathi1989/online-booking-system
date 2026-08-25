import { InputType, Field, Float, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, IsNumber, IsInt, Min, Max } from 'class-validator';

@InputType('DrugInput')
export class DrugInput {
  @Field() @IsNotEmpty() @IsString() name: string;
  @Field({ nullable: true }) @IsOptional() @IsString() composition?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() strength?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() form?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() schedule_class?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() hsn?: string;
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() @Min(0) @Max(100) gst_rate?: number;
  @Field({ nullable: true }) @IsOptional() @IsString() manufacturer?: string;
  // REQ022 (US-PHR-09, scoped) — omitted/null means no low-stock alert is
  // configured for this drug.
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(0) reorder_level?: number;
}
