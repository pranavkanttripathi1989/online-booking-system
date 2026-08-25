import { ObjectType, Field, ID } from '@nestjs/graphql';

// Registered as GraphQL type 'Clinic' (singular) — frontend/src/graphql/queries.js's
// CLINICIAN_FIELDS fragment nests `clinics { id name city }` with this exact shape.
@ObjectType('Clinic')
export class ClinicType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  address: string;

  @Field({ nullable: true })
  city?: string;

  @Field({ nullable: true })
  postcode?: string;

  // REQ101.
  @Field({ nullable: true })
  state?: string;

  @Field({ nullable: true })
  gstin?: string;

  @Field({ nullable: true })
  timezone?: string;

  @Field()
  phone: string;

  @Field()
  email: string;

  @Field()
  is_active: boolean;

  // REQ041 -- exactly one true per client_org_id, enforced by a partial
  // unique index (migration 20260823040000), not just app-level convention.
  @Field()
  is_primary: boolean;
}
