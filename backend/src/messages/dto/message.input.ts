import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, ArrayMinSize } from 'class-validator';

@InputType('CreateThreadInput')
export class CreateThreadInput {
  @Field(() => [ID]) @ArrayMinSize(1) participant_ids: string[];
  @Field() @IsNotEmpty() first_message: string;
}
