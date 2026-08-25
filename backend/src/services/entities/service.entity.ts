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

// REQ016 (US-CAT-04) — mirrors CategoryPricingInput/ChannelPricingInput's
// own field set exactly.
@ObjectType('CategoryPricing')
export class CategoryPricingType {
  @Field(() => Float, { nullable: true }) general?: number;
  @Field(() => Float, { nullable: true }) corporate?: number;
  @Field(() => Float, { nullable: true }) staff?: number;
  @Field(() => Float, { nullable: true }) camp?: number;
}

@ObjectType('ChannelPricing')
export class ChannelPricingType {
  @Field(() => Float, { nullable: true }) online?: number;
  @Field(() => Float, { nullable: true }) walkin?: number;
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
  // REQ101.
  @Field(() => Float, { nullable: true }) gst_rate?: number;
  @Field(() => ServiceCategoryType, { nullable: true }) category?: ServiceCategoryType;
  @Field(() => [ServiceClinicianType]) clinicians: ServiceClinicianType[];
  // REQ014 (US-ORG-03) — optional specialty grouping.
  @Field(() => ID, { nullable: true }) department_id?: string;
  @Field(() => DepartmentType, { nullable: true }) department?: DepartmentType;
  // REQ016 (US-CAT-04).
  @Field(() => CategoryPricingType, { nullable: true }) category_pricing?: CategoryPricingType;
  @Field(() => ChannelPricingType, { nullable: true }) channel_pricing?: ChannelPricingType;
  // REQ018 (US-BOOK-03).
  @Field() prepayment_policy: string;
  // REQ111 — the underlying Products row already carries this (REQ055's
  // own org->branch masters cascade needs it to tell a master service
  // clinic_id: null apart from a clinic-scoped one), but it was never
  // declared on this GraphQL entity before, so the gateway stripped it.
  // toGraphQL()'s existing ...rest spread already passes the value
  // through untouched — no service-layer change needed.
  @Field(() => ID, { nullable: true }) clinic_id?: string;
}
