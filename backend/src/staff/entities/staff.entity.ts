import { ObjectType, Field, ID } from '@nestjs/graphql';

// Registered 'Staff' — from-scratch design against staff/{index,edit,new}.jsx's
// MockStore shape, no prior GraphQL contract existed (next-10-features-
// implementation-plan.md #7, same situation Test Results was in). Staff *is*
// UserProfiles scoped to non-clinician/non-patient roles, not a separate table.
@ObjectType('Staff')
export class StaffType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field() email: string;
  @Field({ nullable: true }) phone?: string;
  @Field() role: string;
  @Field({ nullable: true }) department?: string;
  @Field() status: string;
  @Field() since: Date;
  @Field({ nullable: true }) address?: string;
  @Field({ nullable: true }) notes?: string;
  // REQ102 — distinct from the free-text `department` field above.
  @Field(() => ID, { nullable: true }) departmentId?: string;
}
