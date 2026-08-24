import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsEmail, IsDateString, IsIn } from 'class-validator';

// REQ016 (US-CAT-04) — the requirement doc's own named examples.
export const PATIENT_CATEGORIES = ['general', 'corporate', 'staff', 'camp'] as const;

// Matches CreatePatientPage.jsx/EditPatientPage.jsx's actual submitted shape
// exactly: { first_name, last_name, email, phone, gender, address, notes,
// date_of_birth }. Both create and update reuse this one input type on the
// frontend (CREATE_PATIENT_MUTATION/UPDATE_PATIENT_MUTATION both take
// `input: PatientInput!`), so gender/address/notes stay optional rather than
// required-on-create — the frontend form allows submitting without them.
@InputType('PatientInput')
export class PatientInput {
  @Field() @IsNotEmpty() first_name: string;
  @Field() @IsNotEmpty() last_name: string;
  @Field() @IsEmail() email: string;
  @Field() @IsNotEmpty() phone: string;
  @Field({ nullable: true }) @IsOptional() gender?: string;
  @Field({ nullable: true }) @IsOptional() address?: string;
  @Field({ nullable: true }) @IsOptional() notes?: string;
  @Field() @IsDateString() date_of_birth: string;
  // REQ016 (US-CAT-04) — drives differentiated pricing (resolveServicePrice()).
  @Field({ nullable: true }) @IsOptional() @IsIn(PATIENT_CATEGORIES) patient_category?: string;
}

// REQ018 US-BOOK-02 -- a dependant has no email/phone of their own (a
// child booked under a parent's phone-verified login), so this is
// deliberately a narrower shape than PatientInput, not a reuse of it.
@InputType('AddDependantInput')
export class AddDependantInput {
  @Field() @IsNotEmpty() first_name: string;
  @Field() @IsNotEmpty() last_name: string;
  @Field() @IsDateString() date_of_birth: string;
  @Field({ nullable: true }) @IsOptional() gender?: string;
  @Field() @IsNotEmpty() relation: string;
}

// REQ018 US-BOOK-01 -- merge is permission-gated tightly (see
// patients.resolver.ts) per the requirement's own non-functional note;
// this input carries no override of that, only which two records and why.
@InputType('MergePatientsInput')
export class MergePatientsInput {
  @Field(() => ID) @IsNotEmpty() surviving_patient_id: string;
  @Field(() => ID) @IsNotEmpty() merged_patient_id: string;
  @Field({ nullable: true }) @IsOptional() reason?: string;
}
