import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsOptional, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrganizationAddressInput } from './organization-address.input';

@InputType()
export class OrganizationInput {
  @Field()
  @IsNotEmpty()
  name: string;

  @Field()
  @IsNotEmpty()
  code: string;

  @Field()
  @IsEmail()
  contactEmail: string;

  @Field({ nullable: true })
  @IsOptional()
  contactPhone?: string;

  @Field(() => OrganizationAddressInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizationAddressInput)
  address?: OrganizationAddressInput;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

@InputType()
export class OrganizationSearchInput {
  @Field({ nullable: true })
  @IsOptional()
  search?: string;

  @Field({ nullable: true })
  @IsOptional()
  limit?: number;

  @Field({ nullable: true })
  @IsOptional()
  offset?: number;
}
