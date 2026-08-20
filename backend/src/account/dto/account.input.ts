import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsNotEmpty, MinLength, Matches } from 'class-validator';

@InputType('UpdateMyProfileInput')
export class UpdateMyProfileInput {
  @Field({ nullable: true }) @IsOptional() @IsNotEmpty() first_name?: string;
  @Field({ nullable: true }) @IsOptional() @IsNotEmpty() last_name?: string;
  @Field({ nullable: true }) @IsOptional() phone?: string;
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
