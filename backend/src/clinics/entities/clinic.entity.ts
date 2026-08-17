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

  @Field({ nullable: true })
  timezone?: string;

  @Field()
  phone: string;

  @Field()
  email: string;

  @Field()
  is_active: boolean;
}
