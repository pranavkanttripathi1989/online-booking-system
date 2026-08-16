import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

@InputType()
export class RefreshInput {
  @Field()
  @IsNotEmpty()
  refresh_token: string;
}
