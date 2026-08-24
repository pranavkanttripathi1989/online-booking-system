import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType('IntakeFieldConfig')
export class IntakeFieldConfigType {
  @Field(() => ID) id: string;
  @Field(() => ID) clinic_id: string;
  @Field(() => ID, { nullable: true }) product_id?: string;
  @Field() key: string;
  @Field() label: string;
  @Field() field_type: string;
  @Field() is_required: boolean;
  @Field(() => Int) sort_order: number;
}

@ObjectType('IntakeFieldUserError')
export class IntakeFieldUserErrorType {
  @Field() message: string;
}

@ObjectType('IntakeFieldConfigMutationResult')
export class IntakeFieldConfigMutationResultType {
  @Field() success: boolean;
  @Field(() => [IntakeFieldUserErrorType]) userErrors: IntakeFieldUserErrorType[];
  @Field(() => IntakeFieldConfigType, { nullable: true }) intakeField?: IntakeFieldConfigType;
}

// Appointments.intake_responses' structured GraphQL shape -- see
// AppointmentInput's own comment for why this is a typed list, not a raw
// JSON scalar.
@ObjectType('IntakeFieldResponse')
export class IntakeFieldResponseType {
  @Field() key: string;
  @Field() value: string;
}
