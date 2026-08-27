import { InputType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

// P1-06 — the patient-facing submission form. appointment_id is the only
// FK the client supplies; clinician_id/clinic_id are derived server-side
// from that appointment (Hard Rule 6 — never trust a client-supplied FK
// for something the appointment itself already establishes).
@InputType('CreateReviewInput')
export class CreateReviewInput {
  @Field() @IsNotEmpty() appointment_id: string;
  @Field(() => Int) @IsInt() @Min(1) @Max(5) stars: number;
  @Field() @IsString() @IsNotEmpty() comment: string;
}
