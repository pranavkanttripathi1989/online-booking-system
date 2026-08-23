import { ObjectType, Field, ID } from '@nestjs/graphql';
import { ClinicType } from '../../clinics/entities/clinic.entity';

// REQ017 US-CAL-05. Unlike Rooms (scoped only via its clinic relation),
// Resources owns client_org_id directly (REQ014's own spec) — not exposed
// on this type since every other tenant-scoped entity in this schema
// omits its own client_org_id from the GraphQL surface too (it's a
// filtering/ownership column, not display data).
@ObjectType('Resource')
export class ResourceType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field() type: string;
  @Field() is_bookable: boolean;
  @Field(() => ClinicType, { nullable: true }) clinic?: ClinicType;
}

@ObjectType('ResourceUserError')
export class ResourceUserErrorType {
  @Field() message: string;
}

@ObjectType('ResourceMutationResult')
export class ResourceMutationResultType {
  @Field() success: boolean;
  @Field(() => [ResourceUserErrorType]) userErrors: ResourceUserErrorType[];
}
