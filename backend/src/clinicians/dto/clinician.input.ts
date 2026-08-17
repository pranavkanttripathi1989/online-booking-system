import { InputType, Field, ID, Float } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';

// Matches CreateClinicianPage.jsx/EditClinicianPage.jsx's actual submitted
// shape exactly (context/backend-hard-rules.md Rule 9). clinic_ids/service_ids
// are arrays in the form (multi-select), but Clinicians.clinic_id is singular
// in the schema — only the first id is used, documented deliberate scope-cut,
// see context/phase4-5-increment3-implementation-plan.md.
@InputType('ClinicianInput')
export class ClinicianInput {
  @Field() @IsNotEmpty() first_name: string;
  @Field() @IsNotEmpty() last_name: string;
  @Field() @IsEmail() email: string;
  @Field({ nullable: true }) @IsOptional() phone?: string;
  @Field({ nullable: true }) @IsOptional() gender?: string;
  @Field({ nullable: true }) @IsOptional() bio?: string;
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() @Min(0) consultation_fee?: number;
  @Field(() => ID, { nullable: true }) @IsOptional() clinician_type_id?: string;
  @Field(() => [ID], { nullable: true }) @IsOptional() clinic_ids?: string[];
  @Field(() => [ID], { nullable: true }) @IsOptional() service_ids?: string[];
  @Field(() => [String], { nullable: true }) @IsOptional() languages?: string[];
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_active?: boolean;
}
