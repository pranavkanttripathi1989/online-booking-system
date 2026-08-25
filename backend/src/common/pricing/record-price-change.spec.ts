import { recordPriceChangeIfNeeded } from './record-price-change';

// REQ016 (US-CAT-05) — direct unit coverage of the shared helper, in
// addition to products.service.spec.ts's and services.service.spec.ts's
// own integration-shaped coverage of it via each real call site.
describe('recordPriceChangeIfNeeded', () => {
  let prisma: { priceHistory: { create: jest.Mock } };

  beforeEach(() => {
    prisma = { priceHistory: { create: jest.fn() } };
  });

  it('returns undefined and logs nothing when new_price is undefined (no price field sent)', async () => {
    const result = await recordPriceChangeIfNeeded(prisma as any, {
      product_id: 'p1', client_org_id: 'org-a', old_price: 1000, new_price: undefined, effective_from: undefined, changed_by_user_id: 'u1',
    });
    expect(result).toBeUndefined();
    expect(prisma.priceHistory.create).not.toHaveBeenCalled();
  });

  it('returns undefined and logs nothing when new_price equals old_price', async () => {
    const result = await recordPriceChangeIfNeeded(prisma as any, {
      product_id: 'p1', client_org_id: 'org-a', old_price: 1000, new_price: 1000, effective_from: undefined, changed_by_user_id: 'u1',
    });
    expect(result).toBeUndefined();
    expect(prisma.priceHistory.create).not.toHaveBeenCalled();
  });

  it('an immediate change (no effective_from) logs applied:true and returns the new price', async () => {
    const result = await recordPriceChangeIfNeeded(prisma as any, {
      product_id: 'p1', client_org_id: 'org-a', old_price: 1000, new_price: 2000, effective_from: undefined, changed_by_user_id: 'u1',
    });
    expect(result).toBe(2000);
    expect(prisma.priceHistory.create).toHaveBeenCalledWith({
      data: { product_id: 'p1', client_org_id: 'org-a', old_price: 1000, new_price: 2000, effective_from: expect.any(Date), applied: true, changed_by_user_id: 'u1' },
    });
  });

  it('a past effective_from is treated as immediate (applied:true)', async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const result = await recordPriceChangeIfNeeded(prisma as any, {
      product_id: 'p1', client_org_id: 'org-a', old_price: 1000, new_price: 2000, effective_from: yesterday, changed_by_user_id: 'u1',
    });
    expect(result).toBe(2000);
    expect(prisma.priceHistory.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ applied: true }) }));
  });

  it('a future effective_from logs applied:false and returns the OLD price (deferred)', async () => {
    const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const result = await recordPriceChangeIfNeeded(prisma as any, {
      product_id: 'p1', client_org_id: 'org-a', old_price: 1000, new_price: 2000, effective_from: nextYear, changed_by_user_id: 'u1',
    });
    expect(result).toBe(1000);
    expect(prisma.priceHistory.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ applied: false, new_price: 2000 }) }));
  });

  it('a first-ever price (old_price null) logs old_price as undefined, not null', async () => {
    await recordPriceChangeIfNeeded(prisma as any, {
      product_id: 'p1', client_org_id: 'org-a', old_price: null, new_price: 2000, effective_from: undefined, changed_by_user_id: 'u1',
    });
    expect(prisma.priceHistory.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ old_price: undefined }) }));
  });
});
