import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

@InputType('RequestBreakGlassAccessInput')
export class RequestBreakGlassAccessInput {
  @Field() @IsNotEmpty() reason: string;
}
