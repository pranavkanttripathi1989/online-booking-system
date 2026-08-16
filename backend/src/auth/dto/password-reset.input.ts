import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, MinLength, Matches } from 'class-validator';

@InputType()
export class ForgotPasswordInput {
  @Field()
  @IsEmail()
  email: string;
}

@InputType()
export class ResetPasswordInput {
  @Field()
  @IsNotEmpty()
  token: string;

  @Field()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Password must contain upper and lower case letters and a number',
  })
  new_password: string;
}
