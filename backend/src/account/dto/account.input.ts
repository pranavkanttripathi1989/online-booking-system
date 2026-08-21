import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { IsOptional, IsNotEmpty, MinLength, Matches, IsDateString, IsIn } from 'class-validator';

// PLAN016 Slice A — matches Patients/ClientOrganizations' structured India
// address shape exactly ({line1, line2, city, state, pincode, country}),
// not this table's older, never-exposed flat address_line1/postal_code
// columns (no state field) -- see the schema comment on UserProfiles.address_structured.
@InputType('MyAddressInput')
export class MyAddressInput {
  @Field() @IsNotEmpty() line1: string;
  @Field({ nullable: true }) @IsOptional() line2?: string;
  @Field() @IsNotEmpty() city: string;
  @Field() @IsNotEmpty() state: string;
  @Field()
  @Matches(/^\d{6}$/, { message: 'Pincode must be a valid 6-digit Indian PIN code' })
  pincode: string;
  @Field({ nullable: true }) @IsOptional() country?: string;
}

@ObjectType('MyAddress')
export class MyAddressType {
  @Field() line1: string;
  @Field({ nullable: true }) line2?: string;
  @Field() city: string;
  @Field() state: string;
  @Field() pincode: string;
  @Field({ nullable: true }) country?: string;
}

@InputType('UpdateMyProfileInput')
export class UpdateMyProfileInput {
  @Field({ nullable: true }) @IsOptional() @IsNotEmpty() first_name?: string;
  @Field({ nullable: true }) @IsOptional() @IsNotEmpty() last_name?: string;
  @Field({ nullable: true }) @IsOptional() phone?: string;
  @Field({ nullable: true }) @IsOptional() bio?: string;
  @Field({ nullable: true }) @IsOptional() @IsDateString() date_of_birth?: string;
  @Field({ nullable: true })
  @IsOptional()
  @IsIn(['male', 'female', 'other', 'prefer_not_to_say'])
  gender?: string;
  @Field(() => MyAddressInput, { nullable: true }) @IsOptional() address?: MyAddressInput;
}

// Same complexity rule as RegisterInput (backend/src/auth/dto/register.input.ts)
// -- deliberately duplicated rather than imported, matching how this codebase
// already re-declares small per-DTO validators rather than building a shared
// validators module for a two-line regex.
@InputType('ChangeMyPasswordInput')
export class ChangeMyPasswordInput {
  @Field() @IsNotEmpty() current_password: string;

  @Field()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Password must contain upper and lower case letters and a number',
  })
  new_password: string;
}

// PLAN016 Slice C
@InputType('ConfirmTotpEnrollmentInput')
export class ConfirmTotpEnrollmentInput {
  @Field() @Matches(/^\d{6}$/, { message: 'Code must be 6 digits' }) code: string;
}

@InputType('DisableTotpInput')
export class DisableTotpInput {
  @Field() @IsNotEmpty() password: string;
}
