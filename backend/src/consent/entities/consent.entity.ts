import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType('Consent')
export class ConsentType {
  @Field(() => ID) id: string;
  @Field(() => ID) patient_id: string;
  @Field() purpose: string;
  @Field() granted: boolean;
  @Field() granted_at: Date;
  @Field({ nullable: true }) revoked_at?: Date;
  @Field() notice_version: string;
}

@ObjectType('RightsRequest')
export class RightsRequestType {
  @Field(() => ID) id: string;
  @Field(() => ID) patient_id: string;
  @Field() type: string;
  @Field() status: string;
  @Field() sla_due_at: Date;
  @Field({ nullable: true }) resolved_at?: Date;
  @Field({ nullable: true }) notes?: string;
  @Field() created_at: Date;
}

// REQ034 (US-DPDP-06).
@ObjectType('RetentionPolicy')
export class RetentionPolicyType {
  @Field(() => ID) id: string;
  @Field() data_class: string;
  @Field(() => Int) retention_years: number;
  @Field() legal_hold: boolean;
  @Field() updated_at: Date;
}
