import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsOptional, IsBoolean, Matches } from 'class-validator';

// Field names/shape match frontend/src/pages/manager/clinics/create.jsx's
// INITIAL form state exactly (context/backend-hard-rules.md Rule 9) — flat
// city/postcode/timezone scalars, not a structured address blob.
@InputType()
export class ClinicInput {
  @Field()
  @IsNotEmpty()
  name: string;

  @Field()
  @IsNotEmpty()
  address: string;

  @Field({ nullable: true })
  @IsOptional()
  city?: string;

  // Accepts an Indian 6-digit PIN when present, even though the wire field is
  // still named `postcode` to match the current frontend contract exactly —
  // renaming it (and adding a `state` field) is a documented follow-up, not a
  // silent breaking change made here. See phase4-catalog-modules-implementation-plan.md.
  @Field({ nullable: true })
  @IsOptional()
  @Matches(/^\d{6}$/, { message: 'Postcode must be a valid 6-digit Indian PIN code' })
  postcode?: string;

  @Field({ nullable: true })
  @IsOptional()
  timezone?: string;

  @Field()
  @IsNotEmpty()
  phone: string;

  @Field()
  @IsEmail()
  email: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
