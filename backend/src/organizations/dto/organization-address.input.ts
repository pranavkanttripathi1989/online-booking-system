import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, Matches } from 'class-validator';

// TC-ADMIN-UNIT-013/API-011: state + pincode are required — the legacy flat
// {addressLine1, city, postalCode, country} shape (no state/pincode) is
// explicitly rejected by this DTO's shape alone (those fields don't exist here).
@InputType()
export class OrganizationAddressInput {
  @Field()
  @IsNotEmpty()
  line1: string;

  @Field({ nullable: true })
  @IsOptional()
  line2?: string;

  @Field()
  @IsNotEmpty()
  city: string;

  @Field()
  @IsNotEmpty()
  state: string;

  @Field()
  @Matches(/^\d{6}$/, { message: 'Pincode must be a valid 6-digit Indian PIN code' })
  pincode: string;

  @Field({ nullable: true })
  @IsOptional()
  country?: string;
}
