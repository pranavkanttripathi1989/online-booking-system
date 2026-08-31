import { InputType, Field, ID } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsOptional, IsBoolean, IsArray, IsUrl, Matches } from 'class-validator';

// REQ101 — a standard 15-character Indian GSTIN.
const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/;

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

  // REQ101 — this clinic's own GST registration state/number. Both null
  // until set; AppointmentPayments' GST split stays null until both this
  // AND the paid product's gst_rate are configured.
  @Field({ nullable: true })
  @IsOptional()
  state?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Matches(GSTIN_PATTERN, { message: 'GSTIN must be a valid 15-character format' })
  gstin?: string;

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

  // REQ170 -- prescription-letterhead footer fields. All optional: an
  // existing clinic that never sets these keeps rendering exactly as
  // before this slice.
  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Website must be a valid URL' })
  website?: string;

  @Field({ nullable: true })
  @IsOptional()
  alternate_phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  appointment_note?: string;

  // REQ170 -- an ordered list of Clinicians.id always shown on this
  // clinic's own prescription letterhead (the reference's two-doctor
  // co-branding pattern), independent of who actually issues a given
  // prescription. Cross-clinic/cross-org id validation happens in
  // ClinicsService#update, not here (this DTO only validates shape).
  @Field(() => [ID], { nullable: true })
  @IsOptional()
  @IsArray()
  letterhead_clinician_ids?: string[];
}
