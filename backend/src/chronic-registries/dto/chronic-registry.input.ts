import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsIn, IsOptional, IsString } from 'class-validator';

const CONDITIONS = ['diabetes', 'hypertension'];

@InputType('EnrollInRegistryInput')
export class EnrollInRegistryInput {
  @Field(() => ID) @IsNotEmpty() patient_id: string;
  @Field() @IsIn(CONDITIONS) condition: string;
  @Field({ nullable: true }) @IsOptional() @IsString() notes?: string;
}

@InputType('MarkRegistryReviewedInput')
export class MarkRegistryReviewedInput {
  @Field(() => ID) @IsNotEmpty() enrollment_id: string;
}

@InputType('ResolveRegistryEnrollmentInput')
export class ResolveRegistryEnrollmentInput {
  @Field(() => ID) @IsNotEmpty() enrollment_id: string;
}
