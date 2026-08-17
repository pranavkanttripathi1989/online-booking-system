import { InputType, Field, Int } from '@nestjs/graphql';
import { IsOptional, IsInt, IsString } from 'class-validator';

@InputType('ReviewFilterInput')
export class ReviewFilterInput {
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() stars?: number;
  @Field({ nullable: true }) @IsOptional() @IsString() search?: string;
}
