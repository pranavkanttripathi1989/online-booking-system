import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

@InputType('CreateLanguageInput')
export class CreateLanguageInput {
  @Field() @IsNotEmpty() name: string;
  @Field() @IsNotEmpty() code: string;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_active?: boolean;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_default?: boolean;
}

@InputType('UpdateLanguageInput')
export class UpdateLanguageInput {
  @Field({ nullable: true }) @IsOptional() @IsNotEmpty() name?: string;
  @Field({ nullable: true }) @IsOptional() @IsNotEmpty() code?: string;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_active?: boolean;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_default?: boolean;
}
