import { InputType, Field, Float } from '@nestjs/graphql';
import { IsOptional, IsString, IsNotEmpty, IsEmail, IsIn, IsNumber } from 'class-validator';

@InputType('PublicClinicianSearchInput')
export class PublicClinicianSearchInput {
  @Field({ nullable: true }) @IsOptional() @IsString() specialty?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() city?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() language?: string;
}

@InputType('PatientDetailsInput')
export class PatientDetailsInput {
  @Field() @IsNotEmpty() firstName: string;
  @Field() @IsNotEmpty() lastName: string;
  @Field() @IsEmail() email: string;
  @Field() @IsNotEmpty() phone: string;
}

// Matches booking/index.jsx's actual submitted shape — a deliberately
// separate mutation name and input type from the canonical
// createAppointment/AppointmentInput (Rule 9's own "match the wire contract"
// runs into a hard GraphQL constraint here: two resolvers cannot share one
// field name, and the two dialects' field sets genuinely differ — resolved
// by renaming this one, which had zero real backend before this pass, rather
// than the already-live canonical mutation. booking/index.jsx's own inline
// gql was updated to match, next-10-features-implementation-plan.md's Phase
// P8 follow-up).
@InputType('BookPatientAppointmentInput')
export class BookPatientAppointmentInput {
  @Field() @IsNotEmpty() clinicianId: string;
  @Field() @IsNotEmpty() productId: string;
  @Field({ nullable: true }) @IsOptional() variationId?: string;
  @Field() @IsNotEmpty() date: string;
  @Field() @IsNotEmpty() startTime: string;
  @Field({ nullable: true }) @IsOptional() endTime?: string;
  @Field({ nullable: true }) @IsOptional() @IsIn(['in_person', 'video', 'home_visit']) type?: string;
  @Field({ nullable: true }) @IsOptional() patientId?: string;
  @Field(() => PatientDetailsInput, { nullable: true }) @IsOptional() patientDetails?: PatientDetailsInput;
}

@InputType('PaymentTransactionInput')
export class PaymentTransactionInput {
  @Field() @IsNotEmpty() appointmentId: string;
  @Field({ nullable: true }) @IsOptional() paymentMethodId?: string;
  @Field(() => Float) @IsNumber() amount: number;
  @Field({ nullable: true }) @IsOptional() currency?: string;
}
