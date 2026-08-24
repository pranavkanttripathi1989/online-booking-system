import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { BreakGlassService } from './break-glass.service';
import { BreakGlassGrantType, BreakGlassGrantMutationResultType } from './entities/break-glass.entity';
import { RequestBreakGlassAccessInput } from './dto/break-glass.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver()
export class BreakGlassResolver {
  constructor(private readonly breakGlassService: BreakGlassService) {}

  @Query(() => [BreakGlassGrantType], { name: 'myBreakGlassGrants' })
  @Auth('clinician', 'staff', 'manager', 'admin', 'super_admin')
  myBreakGlassGrants(@CurrentUser() user: JwtPayload) {
    return this.breakGlassService.myGrants(user);
  }

  @Mutation(() => BreakGlassGrantMutationResultType, { name: 'requestBreakGlassAccess' })
  @Auth('clinician', 'staff', 'manager', 'admin', 'super_admin')
  requestBreakGlassAccess(@Args('input') input: RequestBreakGlassAccessInput, @CurrentUser() user: JwtPayload) {
    return this.breakGlassService.request(input, user);
  }

  @Mutation(() => BreakGlassGrantMutationResultType, { name: 'revokeBreakGlassAccess' })
  @Auth('manager', 'admin', 'super_admin')
  revokeBreakGlassAccess(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.breakGlassService.revoke(id, user);
  }
}
