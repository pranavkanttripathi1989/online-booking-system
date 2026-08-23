import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, MinLength, Matches, IsOptional } from 'class-validator';

@InputType()
export class StartOnboardingInput {
  @Field()
  @IsNotEmpty()
  orgName: string;

  @Field({ nullable: true })
  @IsOptional()
  slug?: string;

  @Field()
  @IsEmail()
  contactEmail: string;

  @Field()
  @IsNotEmpty()
  ownerName: string;

  // Same policy as auth/dto/register.input.ts — this account is a real
  // login credential (the org's manager/admin), not a throwaway wizard field.
  @Field()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Password must contain upper and lower case letters and a number',
  })
  ownerPassword: string;
}

@InputType()
export class AddOnboardingClinicInput {
  @Field()
  @IsNotEmpty()
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  address?: string;

  @Field()
  @IsNotEmpty()
  city: string;

  @Field({ nullable: true })
  @IsOptional()
  state?: string;

  @Field({ nullable: true })
  @IsOptional()
  pincode?: string;

  @Field({ nullable: true })
  @IsOptional()
  phone?: string;
}
