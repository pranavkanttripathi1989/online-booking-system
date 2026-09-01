import { ObjectType, Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// REQ175 — settings/index.jsx's "Payment Gateway" section. Mirrors
// notification-provider.entity.ts's own shape exactly (REQ008).
@ObjectType('PaymentGatewayField')
export class PaymentGatewayFieldType {
  @Field() key: string;
  @Field() label: string;
  @Field() type: string;
  @Field() required: boolean;
}

@ObjectType('PaymentGatewayOption')
export class PaymentGatewayOptionType {
  @Field() id: string;
  @Field() label: string;
  @Field(() => [PaymentGatewayFieldType]) fields: PaymentGatewayFieldType[];
}

// credentials are never exposed here — has_credentials is a boolean,
// matching NotificationProviderConfigType's own write-only-secret contract.
@ObjectType('PaymentGatewayConfig')
export class PaymentGatewayConfigType {
  @Field() clinic_id: string;
  @Field({ nullable: true }) provider?: string;
  @Field() has_credentials: boolean;
  @Field() is_active: boolean;
}

@ObjectType('PaymentGatewayConfigResult')
export class PaymentGatewayConfigResultType {
  @Field() success: boolean;
  @Field({ nullable: true }) message?: string;
}

@InputType('PaymentGatewayCredentialFieldInput')
export class PaymentGatewayCredentialFieldInput {
  @Field() @IsNotEmpty() key: string;
  @Field() @IsString() value: string;
}

@InputType('UpdatePaymentGatewayConfigInput')
export class UpdatePaymentGatewayConfigInput {
  @Field() @IsNotEmpty() clinic_id: string;
  @Field() @IsNotEmpty() provider: string;
  @Field(() => [PaymentGatewayCredentialFieldInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentGatewayCredentialFieldInput)
  credentials: PaymentGatewayCredentialFieldInput[];
  @Field({ nullable: true }) @IsOptional() is_active?: boolean;
}
