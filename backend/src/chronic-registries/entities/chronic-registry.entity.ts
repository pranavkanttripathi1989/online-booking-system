import { ObjectType, Field, ID } from '@nestjs/graphql';

// Prisma enums are exposed as plain GraphQL strings in this codebase
// (TestResultType.status is the same shape) rather than a registered
// GraphQL enum type.
@ObjectType('ChronicRegistrySuggestion')
export class ChronicRegistrySuggestionType {
  @Field(() => ID) patient_id: string;
  @Field() patient_name: string;
  @Field() matched_icd10_code: string;
  @Field() matched_diagnosis_text: string;
}

@ObjectType('ChronicRegistryEnrollment')
export class ChronicRegistryEnrollmentType {
  @Field(() => ID) id: string;
  @Field(() => ID) patient_id: string;
  @Field() patient_name: string;
  @Field() condition: string; // diabetes | hypertension
  @Field() status: string; // active | resolved
  @Field() enrolled_at: string;
  @Field({ nullable: true }) enrolled_by_name?: string;
  @Field() last_reviewed_at: string;
  @Field({ nullable: true }) notes?: string;
  @Field() recall_status: string; // overdue | due_soon | upcoming
}
