import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { ConsentService } from './consent.service';
import { ConsentType, RightsRequestType, RetentionPolicyType } from './entities/consent.entity';
import { UpdateConsentInput, RequestDataRightsInput, ResolveRightsRequestInput, RetentionPolicyInput } from './dto/consent.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver()
export class ConsentResolver {
  constructor(private readonly consentService: ConsentService) {}

  @Auth('patient', 'staff', 'manager', 'admin', 'super_admin')
  @Query(() => [ConsentType])
  patientConsents(@Args('patient_id', { type: () => ID }) patientId: string, @CurrentUser() user: JwtPayload) {
    return this.consentService.myConsents(patientId, user);
  }

  @Auth('patient', 'staff', 'manager', 'admin', 'super_admin')
  @Mutation(() => ConsentType)
  updateConsent(@Args('input') input: UpdateConsentInput, @CurrentUser() user: JwtPayload) {
    return this.consentService.updateConsent(input, user);
  }

  @Auth('patient', 'staff', 'manager', 'admin', 'super_admin')
  @Mutation(() => RightsRequestType)
  requestDataRights(@Args('input') input: RequestDataRightsInput, @CurrentUser() user: JwtPayload) {
    return this.consentService.requestDataRights(input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Query(() => [RightsRequestType])
  rightsRequests(
    @Args('status', { type: () => String, nullable: true }) status: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.consentService.findRightsRequests(status, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => RightsRequestType)
  resolveRightsRequest(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: ResolveRightsRequestInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.consentService.resolveRightsRequest(id, input, user);
  }

  // REQ034 (US-DPDP-06).
  @Auth('manager', 'admin', 'super_admin')
  @Query(() => [RetentionPolicyType])
  retentionPolicies(@CurrentUser() user: JwtPayload) {
    return this.consentService.findRetentionPolicies(user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => RetentionPolicyType)
  setRetentionPolicy(@Args('input') input: RetentionPolicyInput, @CurrentUser() user: JwtPayload) {
    return this.consentService.setRetentionPolicy(input, user);
  }
}
