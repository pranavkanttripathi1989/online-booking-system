import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';

// Matches appointments/index.jsx's buildFilters() exactly: date_from/date_to
// (YYYY-MM-DD strings), status, clinician_id, patient_name (free-text search
// against the patient's name, not an ID).
@InputType('AppointmentFilters')
export class AppointmentFiltersInput {
  @Field({ nullable: true }) @IsOptional() @IsString() date_from?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() date_to?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() status?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() clinician_id?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() patient_name?: string;
}
