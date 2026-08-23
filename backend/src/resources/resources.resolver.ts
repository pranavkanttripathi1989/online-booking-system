import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { ResourcesService } from './resources.service';
import { ResourceType, ResourceMutationResultType } from './entities/resource.entity';
import { ResourceInput } from './dto/resource.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => ResourceType)
export class ResourcesResolver {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Auth('manager', 'admin', 'super_admin', 'staff')
  @Query(() => [ResourceType])
  resources(@Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string, @CurrentUser() user: JwtPayload) {
    return this.resourcesService.findAll(clinicId, user);
  }

  @Auth('manager', 'admin', 'super_admin', 'staff')
  @Query(() => ResourceType, { nullable: true })
  resource(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.resourcesService.findOne(id, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ResourceType)
  createResource(@Args('input') input: ResourceInput, @CurrentUser() user: JwtPayload) {
    return this.resourcesService.create(input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ResourceType)
  updateResource(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: ResourceInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.resourcesService.update(id, input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ResourceMutationResultType)
  deleteResource(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.resourcesService.remove(id, user);
  }
}
