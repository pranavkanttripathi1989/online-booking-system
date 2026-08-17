import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsEmail, IsDateString } from 'class-validator';

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
}
