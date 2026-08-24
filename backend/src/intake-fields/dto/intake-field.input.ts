import { InputType, Field, ID, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsInt, Min, IsBoolean, IsIn } from 'class-validator';

const FIELD_TYPES = ['text', 'textarea', 'number', 'boolean'];

@InputType('CreateIntakeFieldInput')
export class CreateIntakeFieldInput {
  @Field(() => ID) @IsNotEmpty() clinic_id: string;
  @Field(() => ID, { nullable: true }) @IsOptional() product_id?: string;
  @Field() @IsNotEmpty() key: string;
  @Field() @IsNotEmpty() label: string;
  @Field({ nullable: true }) @IsOptional() @IsIn(FIELD_TYPES) field_type?: string;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_required?: boolean;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(0) sort_order?: number;
}

@InputType('UpdateIntakeFieldInput')
export class UpdateIntakeFieldInput {
  @Field({ nullable: true }) @IsOptional() label?: string;
  @Field({ nullable: true }) @IsOptional() @IsIn(FIELD_TYPES) field_type?: string;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_required?: boolean;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(0) sort_order?: number;
}

@InputType('IntakeFieldResponseInput')
export class IntakeFieldResponseInput {
  @Field() @IsNotEmpty() key: string;
  @Field() @IsNotEmpty() value: string;
}
