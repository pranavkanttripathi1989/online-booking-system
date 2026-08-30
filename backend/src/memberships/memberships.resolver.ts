import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { MembershipsService } from './memberships.service';
import { MembershipPlanType, PatientMembershipType, MembershipPlanMutationResultType, EnrollMembershipResultType } from './entities/membership.entity';
import {
  CreateMembershipPlanInput,
  UpdateMembershipPlanInput,
  EnrollPatientMembershipInput,
  CancelPatientMembershipInput,
} from './dto/membership.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// Widened past packages.resolver.ts's own CATALOG_STAFF_ROLES to include
// 'clinician' -- patients/detail.jsx (the page this exists to serve) is a
// clinician-facing page, and its own isSameOrg() checks inside the service
// would otherwise be unreachable dead code for the caller who actually uses
// this feature (the exact class of gap this session's own prior work on
// webhooks/api-keys already found and fixed).
const MEMBERSHIP_VIEWER_ROLES = ['clinician', 'manager', 'admin', 'super_admin', 'staff'] as const;
const CATALOG_MANAGER_ROLES = ['admin', 'super_admin', 'manager'] as const;

@Resolver()
export class MembershipsResolver {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Query(() => [MembershipPlanType], { name: 'membershipPlans' })
  @Auth(...MEMBERSHIP_VIEWER_ROLES)
  membershipPlans(@Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string | undefined, @CurrentUser() user: JwtPayload) {
    return this.membershipsService.listPlans(clinicId, user);
  }

  @Query(() => PatientMembershipType, { name: 'patientMembership', nullable: true })
  @Auth('patient', ...MEMBERSHIP_VIEWER_ROLES)
  patientMembership(@Args('patient_id', { type: () => ID }) patientId: string, @CurrentUser() user: JwtPayload) {
    return this.membershipsService.patientMembership(patientId, user);
  }

  @Mutation(() => MembershipPlanMutationResultType, { name: 'createMembershipPlan' })
  @Auth(...CATALOG_MANAGER_ROLES)
  createMembershipPlan(@Args('input') input: CreateMembershipPlanInput, @CurrentUser() user: JwtPayload) {
    return this.membershipsService.createPlan(input, user);
  }

  @Mutation(() => MembershipPlanMutationResultType, { name: 'updateMembershipPlan' })
  @Auth(...CATALOG_MANAGER_ROLES)
  updateMembershipPlan(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateMembershipPlanInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.membershipsService.updatePlan(id, input, user);
  }

  @Mutation(() => MembershipPlanMutationResultType, { name: 'deleteMembershipPlan' })
  @Auth(...CATALOG_MANAGER_ROLES)
  deleteMembershipPlan(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.membershipsService.removePlan(id, user);
  }

  @Mutation(() => EnrollMembershipResultType, { name: 'enrollPatientMembership' })
  @Auth(...MEMBERSHIP_VIEWER_ROLES)
  enrollPatientMembership(@Args('input') input: EnrollPatientMembershipInput, @CurrentUser() user: JwtPayload) {
    return this.membershipsService.enroll(input, user);
  }

  @Mutation(() => EnrollMembershipResultType, { name: 'cancelPatientMembership' })
  @Auth(...MEMBERSHIP_VIEWER_ROLES)
  cancelPatientMembership(@Args('input') input: CancelPatientMembershipInput, @CurrentUser() user: JwtPayload) {
    return this.membershipsService.cancel(input, user);
  }
}
