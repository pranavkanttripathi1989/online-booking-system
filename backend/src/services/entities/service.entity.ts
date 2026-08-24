import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { DepartmentType } from '../../departments/entities/department.entity';

@ObjectType('ServiceCategory')
export class ServiceCategoryType {
  @Field(() => ID) id: string;
  @Field() name: string;
}

@ObjectType('ServiceClinician')
export class ServiceClinicianType {
  @Field(() => ID) id: string;
  @Field() full_name: string;
}

// Registered 'Service' — matches SERVICES_QUERY/SERVICE_DETAIL_QUERY/
// CREATE_SERVICE_MUTATION/UPDATE_SERVICE_MUTATION (frontend/src/graphql/*.js),
// the canonical shape used by manager/services/create.jsx|edit.jsx|detail.jsx.
// Backed by the same Prisma `Products` table as the (deliberately out-of-scope
// this increment) manager/products/* pages — see context/phase4-5-increment3-implementation-plan.md.
@ObjectType('Service')
export class ServiceType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field({ nullable: true }) description?: string;
  @Field(() => Int, { nullable: true }) duration_minutes?: number;
  // Products.price is stored in paise (schema comment, CLAUDE.md); GraphQL
  // exposes rupees to match what manager/services/create.jsx actually sends
  // and displays — converted at the resolver boundary, not in the schema.
  @Field(() => Float, { nullable: true }) price?: number;
  @Field() is_active: boolean;
  @Field({ nullable: true }) hsn?: string;
  @Field() is_tax_exempt: boolean;
  @Field(() => ServiceCategoryType, { nullable: true }) category?: ServiceCategoryType;
  @Field(() => [ServiceClinicianType]) clinicians: ServiceClinicianType[];
  // REQ014 (US-ORG-03) — optional specialty grouping.
  @Field(() => ID, { nullable: true }) department_id?: string;
  @Field(() => DepartmentType, { nullable: true }) department?: DepartmentType;
}
