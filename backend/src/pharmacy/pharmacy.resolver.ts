import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PharmacyService } from './pharmacy.service';
import { DrugBatchType, StockMovementType, LowStockDrugType, PendingDispenseItemType, RecordPharmacyPaymentResultType } from './entities/pharmacy.entity';
import { ReceiveStockInput, AdjustStockInput, DispensePrescriptionItemInput, RecordPharmacyPaymentInput } from './dto/pharmacy.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { EntitlementGuard, RequiresFeature } from '../entitlements/entitlement.guard';

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

  // REQ022 (US-PHR-09, scoped).
  @Auth('staff', 'manager', 'admin', 'super_admin')
  @Query(() => [DrugBatchType])
  nearExpiryBatches(
    @Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string | undefined,
    @Args('horizon_days', { type: () => Int, nullable: true, defaultValue: 90 }) horizonDays: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.pharmacyService.nearExpiryBatches(clinicId, horizonDays, user);
  }

  @Auth('staff', 'manager', 'admin', 'super_admin')
  @Query(() => [LowStockDrugType])
  lowStockDrugs(@Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string | undefined, @CurrentUser() user: JwtPayload) {
    return this.pharmacyService.lowStockDrugs(clinicId, user);
  }

  // REQ126
  @Auth('staff', 'manager', 'admin', 'super_admin')
  @Query(() => [PendingDispenseItemType])
  pendingDispenseItems(@CurrentUser() user: JwtPayload) {
    return this.pharmacyService.pendingDispenseItems(user);
  }

  // P1-04 — the concrete first use of the entitlement guard, matching the
  // exact example the schema's own PlanVersions.feature_flags_json
  // comment already names ({ "pharmacy": true }). Opt-in per this one
  // mutation via @UseGuards(EntitlementGuard) — NOT registered in
  // app.module.ts's global APP_GUARD array, so every other resolver in
  // the app is completely unaffected by this change (CLAUDE.md's own
  // standing caution on rolling this out module-by-module, not globally).
  // An org with no plan assigned (every real org today) stays fully
  // ungated — see EntitlementsService's own "fail open for legacy" note.
  @Auth('staff', 'manager', 'admin', 'super_admin')
  @UseGuards(EntitlementGuard)
  @RequiresFeature('pharmacy')
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

  // REQ177 -- counter-payment collection for dispensed medicines.
  @Auth('staff', 'manager', 'admin', 'super_admin')
  @Mutation(() => RecordPharmacyPaymentResultType)
  recordPharmacyPayment(@Args('input') input: RecordPharmacyPaymentInput, @CurrentUser() user: JwtPayload) {
    return this.pharmacyService.recordPharmacyPayment(input, user);
  }
}
