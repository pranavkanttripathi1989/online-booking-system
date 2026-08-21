import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { OrgSettingsService } from './org-settings.service';
import {
  OrgCommunicationSettingsType,
  OrgCommunicationSettingsMutationResultType,
  OrgBookingPoliciesType,
  OrgBookingPoliciesMutationResultType,
  OrgSecuritySettingsType,
  OrgSecuritySettingsMutationResultType,
  OrgBrandingType,
  OrgBrandingMutationResultType,
} from './entities/org-settings.entity';
import {
  UpdateOrgCommunicationSettingsInput,
  UpdateOrgBookingPoliciesInput,
  UpdateOrgSecuritySettingsInput,
  UpdateOrgBrandingInput,
} from './dto/org-settings.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver()
export class OrgSettingsResolver {
  constructor(private readonly orgSettingsService: OrgSettingsService) {}

  @Query(() => OrgCommunicationSettingsType, { name: 'myOrgCommunicationSettings', nullable: true })
  @Auth('manager', 'admin', 'super_admin')
  myOrgCommunicationSettings(@CurrentUser() user: JwtPayload) {
    return this.orgSettingsService.myCommunicationSettings(user);
  }

  @Mutation(() => OrgCommunicationSettingsMutationResultType, { name: 'updateMyOrgCommunicationSettings' })
  @Auth('manager', 'admin', 'super_admin')
  updateMyOrgCommunicationSettings(
    @Args('input') input: UpdateOrgCommunicationSettingsInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.orgSettingsService.updateMyCommunicationSettings(input, user);
  }

  @Query(() => OrgBookingPoliciesType, { name: 'myOrgBookingPolicies', nullable: true })
  @Auth('manager', 'admin', 'super_admin')
  myOrgBookingPolicies(@CurrentUser() user: JwtPayload) {
    return this.orgSettingsService.myBookingPolicies(user);
  }

  @Mutation(() => OrgBookingPoliciesMutationResultType, { name: 'updateMyOrgBookingPolicies' })
  @Auth('manager', 'admin', 'super_admin')
  updateMyOrgBookingPolicies(@Args('input') input: UpdateOrgBookingPoliciesInput, @CurrentUser() user: JwtPayload) {
    return this.orgSettingsService.updateMyBookingPolicies(input, user);
  }

  @Query(() => OrgSecuritySettingsType, { name: 'myOrgSecuritySettings', nullable: true })
  @Auth('manager', 'admin', 'super_admin')
  myOrgSecuritySettings(@CurrentUser() user: JwtPayload) {
    return this.orgSettingsService.mySecuritySettings(user);
  }

  @Mutation(() => OrgSecuritySettingsMutationResultType, { name: 'updateMyOrgSecuritySettings' })
  @Auth('manager', 'admin', 'super_admin')
  updateMyOrgSecuritySettings(@Args('input') input: UpdateOrgSecuritySettingsInput, @CurrentUser() user: JwtPayload) {
    return this.orgSettingsService.updateMySecuritySettings(input, user);
  }

  // No role restriction (any authenticated role) -- AppShell reads this for
  // every logged-in user (manager/clinician/staff/patient) to render the
  // org's logo/name in the sidebar, not just on the manager-only Settings
  // page. Still authenticated by default via the global GqlAuthGuard.
  @Query(() => OrgBrandingType, { name: 'myOrgBranding', nullable: true })
  myOrgBranding(@CurrentUser() user: JwtPayload) {
    return this.orgSettingsService.myBranding(user);
  }

  @Mutation(() => OrgBrandingMutationResultType, { name: 'updateMyOrgBranding' })
  @Auth('manager', 'admin', 'super_admin')
  updateMyOrgBranding(@Args('input') input: UpdateOrgBrandingInput, @CurrentUser() user: JwtPayload) {
    return this.orgSettingsService.updateMyBranding(input, user);
  }
}
