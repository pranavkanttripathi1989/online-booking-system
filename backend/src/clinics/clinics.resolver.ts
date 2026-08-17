import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { ClinicsService } from './clinics.service';
import { ClinicType } from './entities/clinic.entity';
import { ClinicInput } from './dto/clinic.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => ClinicType)
export class ClinicsResolver {
  constructor(private readonly clinicsService: ClinicsService) {}

  // Read access: any authenticated role (patients need this for the booking
  // wizard's clinic-selection step) — GqlAuthGuard is global, so no explicit
  // guard annotation is needed here; only @Roles()-gated writes need @Auth().
  @Query(() => [ClinicType])
  clinics(@CurrentUser() user: JwtPayload) {
    return this.clinicsService.findAll(user);
  }

  @Query(() => ClinicType, { nullable: true })
  clinic(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.clinicsService.findOne(id, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ClinicType)
  createClinic(@Args('input') input: ClinicInput, @CurrentUser() user: JwtPayload) {
    return this.clinicsService.create(input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ClinicType)
  updateClinic(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: ClinicInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.clinicsService.update(id, input, user);
  }
}
