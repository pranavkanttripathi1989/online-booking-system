import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { PharmacyService } from './pharmacy.service';
import { DrugBatchType, StockMovementType } from './entities/pharmacy.entity';
import { ReceiveStockInput, AdjustStockInput, DispensePrescriptionItemInput } from './dto/pharmacy.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => DrugBatchType)
export class PharmacyResolver {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @Auth('staff', 'manager', 'admin', 'super_admin')
  @Query(() => [DrugBatchType])
  drugBatches(
    @Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string | undefined,
    @Args('drug_id', { type: () => ID, nullable: true }) drugId: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.pharmacyService.findBatches(clinicId, drugId, user);
  }

  @Auth('staff', 'manager', 'admin', 'super_admin')
  @Query(() => [StockMovementType])
  stockMovements(@Args('batch_id', { type: () => ID }) batchId: string, @CurrentUser() user: JwtPayload) {
    return this.pharmacyService.findMovements(batchId, user);
  }

  @Auth('staff', 'manager', 'admin', 'super_admin')
  @Mutation(() => DrugBatchType)
  receiveStock(@Args('input') input: ReceiveStockInput, @CurrentUser() user: JwtPayload) {
    return this.pharmacyService.receiveStock(input, user);
  }

  @Auth('staff', 'manager', 'admin', 'super_admin')
  @Mutation(() => DrugBatchType)
  adjustStock(@Args('input') input: AdjustStockInput, @CurrentUser() user: JwtPayload) {
    return this.pharmacyService.adjustStock(input, user);
  }

  @Auth('staff', 'manager', 'admin', 'super_admin')
  @Mutation(() => DrugBatchType)
  dispensePrescriptionItem(@Args('input') input: DispensePrescriptionItemInput, @CurrentUser() user: JwtPayload) {
    return this.pharmacyService.dispensePrescriptionItem(input, user);
  }
}
