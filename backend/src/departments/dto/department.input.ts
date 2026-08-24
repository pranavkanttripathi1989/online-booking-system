import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional } from 'class-validator';

// REQ014 (US-ORG-03) — a specialty grouping (Cardiology, Dental, Physio)
// assigned to one clinic. One shared input for create and update, matching
// ResourceInput's established convention rather than inventing separate
// Create/Update input types.
@InputType()
export class DepartmentInput {
  @Field()
  @IsNotEmpty()
  name: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  clinic_id?: string;
}
