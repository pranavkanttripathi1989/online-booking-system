import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PharmacyResolver } from './pharmacy.resolver';
import { REQUIRES_FEATURE_KEY, EntitlementGuard } from '../entitlements/entitlement.guard';

// P1-04 — receiveStock is the concrete first real use of the entitlement
// guard. This asserts the metadata/guard wiring is actually present on the
// handler, matching how roles.guard's own tests assert @Auth metadata
// rather than re-testing RolesGuard's own logic here.
describe('PharmacyResolver — entitlement gating', () => {
  const reflector = new Reflector();

  it('receiveStock carries @RequiresFeature(\'pharmacy\')', () => {
    const key = reflector.get(REQUIRES_FEATURE_KEY, PharmacyResolver.prototype.receiveStock);
    expect(key).toBe('pharmacy');
  });

  it('receiveStock has EntitlementGuard attached via @UseGuards', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, PharmacyResolver.prototype.receiveStock) ?? [];
    expect(guards).toContain(EntitlementGuard);
  });

  it('no other pharmacy mutation/query carries @RequiresFeature — this is a deliberately narrow, one-resolver proof of concept, not a blanket gate', () => {
    const otherHandlers = [
      PharmacyResolver.prototype.drugBatches,
      PharmacyResolver.prototype.stockMovements,
      PharmacyResolver.prototype.nearExpiryBatches,
      PharmacyResolver.prototype.lowStockDrugs,
      PharmacyResolver.prototype.pendingDispenseItems,
      PharmacyResolver.prototype.adjustStock,
      PharmacyResolver.prototype.dispensePrescriptionItem,
    ];
    otherHandlers.forEach((handler) => {
      expect(reflector.get(REQUIRES_FEATURE_KEY, handler)).toBeUndefined();
    });
  });
});
