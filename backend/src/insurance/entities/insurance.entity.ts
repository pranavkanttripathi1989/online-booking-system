import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { ClinicType } from '../../clinics/entities/clinic.entity';

@ObjectType('Payer')
export class PayerType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field() payer_type: string;
  @Field() is_active: boolean;
}

@ObjectType('PayerEmpanelment')
export class PayerEmpanelmentType {
  @Field(() => ID) id: string;
  @Field(() => PayerType) payer: PayerType;
  @Field(() => ClinicType) clinic: ClinicType;
  @Field() status: string;
  @Field() start_date: Date;
  @Field({ nullable: true }) end_date?: Date;
  @Field({ nullable: true }) renewal_reminder_date?: Date;
}

@ObjectType('PatientInsurancePolicy')
export class PatientInsurancePolicyType {
  @Field(() => ID) id: string;
  @Field(() => ID) patient_id: string;
  @Field(() => PayerType) payer: PayerType;
  @Field() policy_number: string;
  @Field() policy_holder_name: string;
  @Field() valid_from: Date;
  @Field({ nullable: true }) valid_until?: Date;
  @Field() is_active: boolean;
}

// REQ031 (US-INS-02).
@ObjectType('PayerTariff')
export class PayerTariffType {
  @Field(() => ID) id: string;
  @Field(() => PayerType) payer: PayerType;
  @Field(() => ID) product_id: string;
  @Field({ nullable: true }) product_name?: string;
  @Field(() => Float) tariff_price: number;
  @Field() updated_at: Date;
}
