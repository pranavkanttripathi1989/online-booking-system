import { InputType, Field, ID, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';

@InputType('CreateChecklistItemInput')
export class CreateChecklistItemInput {
  @Field(() => ID) @IsNotEmpty() clinic_id: string;
  @Field(() => ID, { nullable: true }) @IsOptional() product_id?: string;
  @Field() @IsNotEmpty() label: string;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_required?: boolean;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(0) sort_order?: number;
}

@InputType('UpdateChecklistItemInput')
export class UpdateChecklistItemInput {
  @Field({ nullable: true }) @IsOptional() label?: string;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_required?: boolean;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(0) sort_order?: number;
}
