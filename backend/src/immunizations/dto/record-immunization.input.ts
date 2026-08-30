import { InputType, Field, ID, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsInt, Min, IsOptional, IsString } from 'class-validator';

@InputType('RecordImmunizationInput')
export class RecordImmunizationInput {
  @Field(() => ID) @IsNotEmpty() patient_id: string;
  @Field(() => ID, { nullable: true }) @IsOptional() @IsString() schedule_item_id?: string;
  @Field(() => ID, { nullable: true }) @IsOptional() @IsString() encounter_id?: string;
  @Field() @IsNotEmpty() vaccine_name: string;
  @Field(() => Int) @IsInt() @Min(1) dose_number: number;
  @Field({ nullable: true }) @IsOptional() @IsString() administered_at?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() batch_no?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() site?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() notes?: string;
}
