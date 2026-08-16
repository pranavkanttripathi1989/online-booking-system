import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, Length } from 'class-validator';

@InputType()
export class RequestOtpInput {
  @Field()
  @IsNotEmpty()
  phone: string;
}

@InputType()
export class VerifyOtpInput {
  @Field()
  @IsNotEmpty()
  phone: string;

  @Field()
  @Length(6, 6)
  code: string;
}
