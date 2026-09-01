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

  // REQ173 -- widened to include 'clinician': a clinician who can't find a
  // drug in the seeded/admin-curated list can add it to their own org's
  // catalog directly from the Rx builder. update/delete stay
  // manager/admin/super_admin-only (below, unchanged) -- a clinician who
  // makes a typo flags it rather than silently mutating shared catalog
  // data other clinicians may already depend on.
  @Auth('manager', 'admin', 'super_admin', 'clinician')
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

  // REQ173 -- a clinician's personal single-drug quick-pick list, distinct
  // from the existing multi-drug PrescriptionSets. Self-scoped via the
  // caller's own JWT clinician_id, never a client-supplied id.
  @Auth('clinician')
  @Query(() => [DrugType])
  myFavouriteDrugs(@CurrentUser() user: JwtPayload) {
    return this.drugsService.findFavourites(user);
  }

  @Auth('clinician')
  @Mutation(() => Boolean)
  addFavouriteDrug(@Args('drug_id', { type: () => ID }) drugId: string, @CurrentUser() user: JwtPayload) {
    return this.drugsService.addFavourite(drugId, user);
  }

  @Auth('clinician')
  @Mutation(() => Boolean)
  removeFavouriteDrug(@Args('drug_id', { type: () => ID }) drugId: string, @CurrentUser() user: JwtPayload) {
    return this.drugsService.removeFavourite(drugId, user);
  }
}
