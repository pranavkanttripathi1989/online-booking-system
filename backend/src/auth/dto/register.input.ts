import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, MinLength, Matches, IsOptional } from 'class-validator';

@InputType()
export class RegisterInput {
  @Field()
  @IsEmail()
  email: string;

  // TC-AUTH-UNIT-010: min 8 chars, mixed case, at least one digit.
  @Field()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Password must contain upper and lower case letters and a number',
  })
  password: string;

  @Field()
  @IsNotEmpty()
  first_name: string;

  @Field()
  @IsNotEmpty()
  last_name: string;

  @Field({ nullable: true })
  @IsOptional()
  phone?: string;
}
