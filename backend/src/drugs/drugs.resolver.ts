import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { DrugsService } from './drugs.service';
import { DrugType } from './entities/drug.entity';
import { DrugInput } from './dto/drug.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => DrugType)
export class DrugsResolver {
  constructor(private readonly drugsService: DrugsService) {}

  // Read access: any authenticated role (matches products()'s own
  // no-@Auth()-needed convention — the global guard already requires auth).
  @Query(() => [DrugType])
  drugs(@CurrentUser() user: JwtPayload, @Args('search', { nullable: true }) search?: string) {
    return this.drugsService.findAll(user, search);
  }

  @Query(() => DrugType, { nullable: true })
  drug(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.drugsService.findOne(id, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => DrugType)
  createDrug(@Args('input') input: DrugInput, @CurrentUser() user: JwtPayload) {
    return this.drugsService.create(input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => DrugType)
  updateDrug(@Args('id', { type: () => ID }) id: string, @Args('input') input: DrugInput, @CurrentUser() user: JwtPayload) {
    return this.drugsService.update(id, input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => Boolean)
  deleteDrug(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.drugsService.remove(id, user);
  }
}
