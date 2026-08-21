import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { ServicesService } from './services.service';
import { ServiceType } from './entities/service.entity';
import { ServiceInput } from './dto/service.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => ServiceType)
export class ServicesResolver {
  constructor(private readonly servicesService: ServicesService) {}

  @Query(() => [ServiceType])
  services(
    @Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string,
    @Args('is_active', { type: () => Boolean, nullable: true }) isActive: boolean,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.servicesService.findAll(clinicId, isActive, user);
  }

  @Query(() => ServiceType, { nullable: true })
  service(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.servicesService.findOne(id, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ServiceType)
  createService(@Args('input') input: ServiceInput, @CurrentUser() user: JwtPayload) {
    return this.servicesService.create(input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ServiceType)
  updateService(@Args('id', { type: () => ID }) id: string, @Args('input') input: ServiceInput, @CurrentUser() user: JwtPayload) {
    return this.servicesService.update(id, input, user);
  }
}
