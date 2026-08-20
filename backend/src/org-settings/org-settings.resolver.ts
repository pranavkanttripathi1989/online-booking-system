import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { OrgSettingsService } from './org-settings.service';
import {
  OrgCommunicationSettingsType,
  OrgCommunicationSettingsMutationResultType,
  OrgBookingPoliciesType,
  OrgBookingPoliciesMutationResultType,
} from './entities/org-settings.entity';
import { UpdateOrgCommunicationSettingsInput, UpdateOrgBookingPoliciesInput } from './dto/org-settings.input';
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
}
