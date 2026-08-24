import { ObjectType, Field, ID } from '@nestjs/graphql';
import { ClinicType } from '../../clinics/entities/clinic.entity';

// REQ014 (US-ORG-03). Owns client_org_id directly, same shape as Resources
// (REQ017) — not exposed on this type since every other tenant-scoped
// entity in this schema omits its own client_org_id from the GraphQL
// surface too (it's a filtering/ownership column, not display data).
@ObjectType('Department')
export class DepartmentType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field(() => ClinicType, { nullable: true }) clinic?: ClinicType;
}

@ObjectType('DepartmentUserError')
export class DepartmentUserErrorType {
  @Field() message: string;
}

@ObjectType('DepartmentMutationResult')
export class DepartmentMutationResultType {
  @Field() success: boolean;
  @Field(() => [DepartmentUserErrorType]) userErrors: DepartmentUserErrorType[];
}
