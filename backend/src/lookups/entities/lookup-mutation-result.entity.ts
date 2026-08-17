import { ObjectType, Field } from '@nestjs/graphql';
import { UserErrorType } from '../../organizations/entities/organization.entity';

// admin/RoomTypes.jsx / admin/ClinicianTypes.jsx request only {success, userErrors}
// on every mutation, never the entity itself — matched exactly (Rule 9).
@ObjectType('LookupMutationResult')
export class LookupMutationResultType {
  @Field() success: boolean;
  @Field(() => [UserErrorType]) userErrors: UserErrorType[];
}
