import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { WaitlistService } from './waitlist.service';
import { WaitlistEntryType, WaitlistMutationResultType } from './entities/waitlist.entity';
import { JoinWaitlistInput } from './dto/waitlist.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver()
export class WaitlistResolver {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Mutation(() => WaitlistMutationResultType, { name: 'joinWaitlist' })
  @Auth('patient')
  joinWaitlist(@Args('input') input: JoinWaitlistInput, @CurrentUser() user: JwtPayload) {
    return this.waitlistService.joinWaitlist(input, user);
  }

  @Query(() => [WaitlistEntryType], { name: 'myWaitlistEntries' })
  @Auth('patient')
  myWaitlistEntries(@CurrentUser() user: JwtPayload) {
    return this.waitlistService.myWaitlistEntries(user);
  }

  // clinic_id omitted -> every entry across every clinic in the caller's own org.
  @Query(() => [WaitlistEntryType], { name: 'clinicWaitlist' })
  @Auth('manager', 'admin', 'super_admin')
  clinicWaitlist(@Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string | undefined, @CurrentUser() user: JwtPayload) {
    return this.waitlistService.clinicWaitlist(clinicId, user);
  }

  @Mutation(() => WaitlistMutationResultType, { name: 'cancelWaitlistEntry' })
  @Auth('patient')
  cancelWaitlistEntry(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.waitlistService.cancelWaitlistEntry(id, user);
  }
}
