import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { PackagesService } from './packages.service';
import { PackageType, PatientPackageType, PackageMutationResultType, PurchasePackageResultType } from './entities/package.entity';
import { CreatePackageInput, UpdatePackageInput, PurchasePackageInput } from './dto/package.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

const CATALOG_STAFF_ROLES = ['manager', 'admin', 'super_admin', 'staff'] as const;

@Resolver()
export class PackagesResolver {
  constructor(private readonly packagesService: PackagesService) {}

  @Query(() => [PackageType], { name: 'packages' })
  @Auth(...CATALOG_STAFF_ROLES)
  packages(@Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string | undefined, @CurrentUser() user: JwtPayload) {
    return this.packagesService.list(clinicId, user);
  }

  @Query(() => [PatientPackageType], { name: 'patientPackages' })
  @Auth('patient', ...CATALOG_STAFF_ROLES)
  patientPackages(@Args('patient_id', { type: () => ID }) patientId: string, @CurrentUser() user: JwtPayload) {
    return this.packagesService.patientPackages(patientId, user);
  }

  @Mutation(() => PackageMutationResultType, { name: 'createPackage' })
  @Auth('admin', 'super_admin', 'manager')
  createPackage(@Args('input') input: CreatePackageInput, @CurrentUser() user: JwtPayload) {
    return this.packagesService.create(input, user);
  }

  @Mutation(() => PackageMutationResultType, { name: 'updatePackage' })
  @Auth('admin', 'super_admin', 'manager')
  updatePackage(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdatePackageInput, @CurrentUser() user: JwtPayload) {
    return this.packagesService.update(id, input, user);
  }

  @Mutation(() => PackageMutationResultType, { name: 'deletePackage' })
  @Auth('admin', 'super_admin', 'manager')
  deletePackage(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.packagesService.remove(id, user);
  }

  @Mutation(() => PurchasePackageResultType, { name: 'purchasePackage' })
  @Auth(...CATALOG_STAFF_ROLES)
  purchasePackage(@Args('input') input: PurchasePackageInput, @CurrentUser() user: JwtPayload) {
    return this.packagesService.purchase(input, user);
  }
}
