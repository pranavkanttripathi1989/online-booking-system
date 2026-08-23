import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsBoolean, IsIn } from 'class-validator';

// REQ017 US-CAL-05 — a bookable org-level asset (e.g. an ECG machine)
// assigned to one clinic. Mirrors RoomInput's shape/validation style; one
// shared input for create and update, matching that established convention
// rather than inventing separate Create/Update input types.
@InputType()
export class ResourceInput {
  @Field()
  @IsNotEmpty()
  name: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  clinic_id?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsIn(['equipment', 'chair', 'machine', 'bay'])
  type?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  is_bookable?: boolean;
}
